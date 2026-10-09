require "test_helper"

class DailyFinalizerTest < ActiveSupport::TestCase
  REGISTERED_ON = Date.new(2026, 10, 1)

  setup do
    travel_to Time.zone.local(2026, 10, 1, 10) do
      @user = create_user # last_reset_on = 登録日（10/1）
    end
    @user.create_goal!(sleep_goal_type: :duration, sleep_goal_minutes: 420, work_goal_minutes: 420,
                       calorie_goal: 2200, protein_goal_g: 60, fat_goal_g: 60, carbs_goal_g: 300, fiber_goal_g: 21)
    @character = @user.character
  end

  def at(day, hour, min = 0)
    Time.zone.local(day.year, day.month, day.day, hour, min)
  end

  def finalize_at(time)
    DailyFinalizer.call(user: @user, now: time)
  end

  test "spec.md 3.3 の計算例: 前日分を確定してキャラのポイントへ反映する" do
    day = Date.new(2026, 10, 6)
    @character.update!(sleep_points: 620, meal_points: 540, exercise_points: 410, work_points: 580, last_reset_on: day - 1)
    run = @user.exercise_tasks.create!(title: "1キロ走る", position: 0)
    @user.exercise_tasks.create!(title: "腕立て伏せ100回", position: 1)
    run.exercise_task_completions.create!(target_date: day, completed_at: at(day, 18))
    @user.sleep_records.create!(slept_at: at(day, 0, 30), woke_at: at(day, 7))
    @user.work_records.create!(started_at: at(day, 9), ended_at: at(day, 14))
    @user.meals.create!(meal_type: :lunch, eaten_at: at(day, 12), calories: 1900, protein_g: 55, fat_g: 70, carbs_g: 260, fiber_g: 12)

    finalized = finalize_at(at(day + 1, 0, 5))
    assert_equal 1, finalized.size
    row = finalized.first
    assert_equal [ 86, 62, 0, 43 ], [ row.sleep_change, row.meal_change, row.exercise_change, row.work_change ]
    assert_equal [ 706, 602, 410, 623, 599 ], [ row.sleep_points, row.meal_points, row.exercise_points, row.work_points, row.total_points ]
    assert row.finalized?

    @character.reload
    assert_equal [ 706, 602, 410, 623, 599 ],
                 [ @character.sleep_points, @character.meal_points, @character.exercise_points, @character.work_points, @character.total_points ]
    assert_equal day, @character.last_reset_on
  end

  test "登録日は確定しない（当日中に呼んでも何もしない）" do
    assert_empty finalize_at(at(REGISTERED_ON, 23, 59))
    assert_equal 500, @character.reload.total_points
    assert_equal 0, @user.daily_achievements.count
  end

  test "記録のない日が3日続くと毎日-100。2回呼んでも二重に反映しない" do
    now = at(REGISTERED_ON + 4, 8) # 10/2〜10/4 の3日分
    finalized = finalize_at(now)
    assert_equal [ Date.new(2026, 10, 2), Date.new(2026, 10, 3), Date.new(2026, 10, 4) ], finalized.map(&:target_date)
    assert_equal [ -100, -100, -100 ], finalized.map(&:sleep_change)
    assert_equal [ 400, 300, 200 ], finalized.map(&:sleep_points)

    @character.reload
    assert_equal 200, @character.sleep_points
    assert_equal 200, @character.total_points
    assert_equal Date.new(2026, 10, 4), @character.last_reset_on

    assert_empty finalize_at(now + 1.hour)
    assert_equal 200, @character.reload.sleep_points
  end

  test "last_reset_on が古くても確定済みの日は飛ばす（finalized_at で二重反映を防ぐ）" do
    finalize_at(at(REGISTERED_ON + 2, 8)) # 10/2 を確定
    @character.reload.update!(last_reset_on: REGISTERED_ON) # 何かの理由で戻ってしまった
    finalized = finalize_at(at(REGISTERED_ON + 3, 8))
    assert_equal [ Date.new(2026, 10, 3) ], finalized.map(&:target_date)
    assert_equal 300, @character.reload.sleep_points
  end

  test "ポイントは0で止まり、増減は実際に動いた分を残す" do
    @character.update!(sleep_points: 30)
    row = finalize_at(at(REGISTERED_ON + 2, 8)).first
    assert_equal 0, row.sleep_points
    assert_equal(-30, row.sleep_change)
  end

  test "当日のうちに作られた行（スコアだけ）も確定時に計算し直す" do
    day = REGISTERED_ON + 1
    travel_to(at(day, 12)) { DailyAchievementUpdater.call(user: @user, dates: [ day ]) }
    @user.sleep_records.create!(slept_at: at(day, 0), woke_at: at(day, 7)) # 行を作った後に記録（420分）

    row = finalize_at(at(day + 1, 1)).first
    assert_equal 100, row.sleep_score
    assert_equal 100, row.sleep_change
  end

  test "目標が未登録の間はポイントを動かさない（日付だけ進める）" do
    @user.goal.destroy!
    @user.reload
    finalized = finalize_at(at(REGISTERED_ON + 3, 8))
    assert_equal 2, finalized.size
    assert(finalized.all? { |row| row.sleep_change.zero? && row.total_points == 500 })
    assert_equal 500, @character.reload.total_points
    assert_equal REGISTERED_ON + 2, @character.last_reset_on
  end

  test "止め忘れで自動終了した睡眠も確定前に数える（日付またぎ）" do
    day = REGISTERED_ON + 1
    @user.sleep_records.create!(slept_at: at(day, 1)) # 起床を押し忘れ
    travel_to(at(day + 1, 9)) do
      OverdueTimerCloser.call(user: @user)      # 1:00 + 16時間 = 17:00 に起床扱い（集計日 10/2）
      row = DailyFinalizer.call(user: @user).last
      assert_equal day, row.target_date
      assert_equal 100, row.sleep_score # 960分 / 420分 → 100 で頭打ち
      assert_equal 100, row.sleep_change
    end
  end
end
