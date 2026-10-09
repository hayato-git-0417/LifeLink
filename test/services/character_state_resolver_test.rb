require "test_helper"

class CharacterStateResolverTest < ActiveSupport::TestCase
  DAY = Date.new(2026, 10, 6)

  setup do
    @user = create_user
    @user.create_goal!(sleep_goal_type: :time_range, bedtime: "00:00", wake_time: "07:00", work_goal_minutes: 420,
                       calorie_goal: 2200, protein_goal_g: 60, fat_goal_g: 60, carbs_goal_g: 300, fiber_goal_g: 21,
                       breakfast_time: "07:00", lunch_time: "12:00", dinner_time: "19:00")
    @character = @user.character
    @task = @user.exercise_tasks.create!(title: "1キロ走る")
  end

  def at(hour, min = 0, day: DAY)
    Time.zone.local(day.year, day.month, day.day, hour, min)
  end

  def resolve(time)
    CharacterStateResolver.call(user: @user, now: time)
  end

  # 朝食を食べて、昼のあいだの「空腹でも満腹でもない」状態にする
  def eat(meal_type, time)
    @user.meals.create!(meal_type: meal_type, eaten_at: time)
  end

  test "優先順: 睡眠中 > 汗汗 > 勉強中 > 満腹 > 空腹 > 睡眠不足 > 太り > デフォルト" do
    @character.update!(exercise_points: 100) # 太り
    @user.sleep_records.create!(slept_at: at(0), woke_at: at(5)) # 300分 → 睡眠不足
    now = at(13, 30)                                              # 朝食・昼食なし → 空腹
    @user.meals.create!(meal_type: :snack, eaten_at: now - 30.minutes) # 満腹
    @user.work_records.create!(started_at: now - 1.hour)               # 勉強中
    @task.exercise_task_completions.create!(target_date: DAY, completed_at: now - 10.minutes) # 汗汗
    @user.sleep_records.create!(slept_at: now - 5.minutes)             # 睡眠中（昼寝）

    assert_equal "sleeping", resolve(now).state
    @user.sleep_records.in_progress.destroy_all
    assert_equal "exercising", resolve(now).state
    ExerciseTaskCompletion.delete_all
    assert_equal "studying", resolve(now).state
    @user.work_records.destroy_all
    assert_equal "full", resolve(now).state
    @user.meals.destroy_all
    assert_equal "hungry", resolve(now).state
    eat(:breakfast, at(7, 30))
    eat(:lunch, at(11, 50)) # 13:30 には食後90分を過ぎている
    assert_equal "sleep_deprived", resolve(now).state
    @user.sleep_records.destroy_all
    assert_equal "fat", resolve(now).state
    @character.update!(exercise_points: 300)
    assert_equal "normal", resolve(now).state
  end

  test "汗汗はチェックしてから30分間、満腹は食後90分間" do
    @task.exercise_task_completions.create!(target_date: DAY, completed_at: at(18))
    assert_equal "exercising", resolve(at(18, 30)).state
    assert_not_equal "exercising", resolve(at(18, 31)).state

    eat(:dinner, at(19))
    assert_equal "full", resolve(at(20, 30)).state
    assert_equal "normal", resolve(at(20, 31)).state
  end

  test "空腹: 食事時刻から60分過ぎてから、次の食事時刻まで。夕食はその日の終わりまで" do
    assert_equal "normal", resolve(at(7, 59)).state
    result = resolve(at(8, 0))
    assert_equal "hungry", result.state
    assert_equal "朝食の記録がない", result.reason
    assert_equal "hungry", resolve(at(11, 59)).state
    assert_equal "normal", resolve(at(12, 0)).state  # 次の食事時刻で朝食の空腹は終わる
    assert_equal "hungry", resolve(at(13, 0)).state  # 昼食の空腹
    assert_equal "hungry", resolve(at(23, 59)).state # 夕食の空腹
    assert_equal "normal", resolve(at(0, 30, day: DAY + 1)).state
  end

  test "空腹: その区分の記録か、食事時刻より後のどれかの食事の記録があれば空腹にならない" do
    eat(:breakfast, at(6, 30)) # 食事時刻より前に食べても朝食なら OK
    assert_equal "normal", resolve(at(9)).state

    eat(:snack, at(12, 30)) # 昼食の代わりに間食（食後90分を過ぎたあと）
    assert_equal "normal", resolve(at(14, 30)).state
  end

  test "食事時刻が未設定の区分は空腹にならない" do
    @user.goal.update!(breakfast_time: nil)
    assert_equal "normal", resolve(at(9)).state
  end

  test "睡眠不足は今日起床していて睡眠スコアが80未満のとき（起床前は判定しない）" do
    assert_equal "normal", resolve(at(6)).state
    @user.sleep_records.create!(slept_at: at(1), woke_at: at(6, 35)) # 335分 / 420 = 79.8
    eat(:breakfast, at(7))
    assert_equal "sleep_deprived", resolve(at(10)).state
    @user.sleep_records.last.update!(woke_at: at(6, 36))              # 336分 = 80.0
    assert_equal "normal", resolve(at(10)).state
  end

  test "状態が変わったら履歴を閉じて新しい行を作る。同じ状態なら作らない" do
    result = resolve(at(8))
    assert result.changed
    assert_equal "hungry", @character.reload.state
    log = @character.character_state_logs.current.sole
    assert_equal "hungry", log.state
    assert_equal DAY, log.target_date

    assert_not resolve(at(9)).changed
    assert_equal 1, @character.character_state_logs.count

    eat(:breakfast, at(9, 30))
    assert resolve(at(9, 30)).changed
    assert_equal at(9, 30), log.reload.ended_at
    assert_equal "full", @character.character_state_logs.current.sole.state
  end

  test "吹き出し: 就寝リマインド > 睡眠不足 > 空腹 > 未完了タスク > 状態のひとこと" do
    assert_equal "そろそろ寝る時間だよ", resolve(at(23, 30, day: DAY - 1)).message
    assert_equal "おなかすいた…", resolve(at(23, 29, day: DAY - 1)).message # 夕食がないので空腹のひとこと

    eat(:breakfast, at(7)); eat(:lunch, at(12)); eat(:dinner, at(19))
    result = resolve(at(20, 31))
    assert result.tasks_remaining
    assert_equal "運動タスクが残ってるよ", result.message
    assert_not resolve(at(19, 59)).tasks_remaining

    @user.meals.dinner.destroy_all
    assert_equal "おなかすいた…", resolve(at(20, 31)).message
  end

  test "就寝リマインド: 時間帯の目標で就寝30分前〜起床時刻、睡眠中・起床済みは出さない、時間指定の目標では出さない" do
    assert resolve(at(23, 30, day: DAY - 1)).bedtime_reminder
    assert resolve(at(3)).bedtime_reminder # 起床時刻までは出す（まだ寝ていない）
    assert_not resolve(at(7)).bedtime_reminder

    @user.sleep_records.create!(slept_at: at(0, 10))
    assert_not resolve(at(0, 20)).bedtime_reminder
    @user.sleep_records.last.update!(woke_at: at(5))
    assert_not resolve(at(5, 30)).bedtime_reminder # 起床済み

    @user.goal.update!(sleep_goal_type: :duration, sleep_goal_minutes: 420)
    assert_not resolve(at(23, 45, day: DAY - 1)).bedtime_reminder
  end
end
