require "test_helper"

class ScoreCalculatorTest < ActiveSupport::TestCase
  DAY = Date.new(2026, 10, 6)

  setup do
    @user = create_user
  end

  def at(hour, min = 0, day: DAY)
    Time.zone.local(day.year, day.month, day.day, hour, min)
  end

  # spec.md 3.3 の目標と記録
  def setup_spec_example
    @user.create_goal!(sleep_goal_type: :duration, sleep_goal_minutes: 420, work_goal_minutes: 420,
                       calorie_goal: 2200, protein_goal_g: 60, fat_goal_g: 60, carbs_goal_g: 300, fiber_goal_g: 21)
    run = @user.exercise_tasks.create!(title: "1キロ走る", position: 0)
    @user.exercise_tasks.create!(title: "腕立て伏せ100回", position: 1)
    run.exercise_task_completions.create!(target_date: DAY, completed_at: at(18))
    @user.sleep_records.create!(slept_at: at(0, 30), woke_at: at(7)) # 390分
    @user.work_records.create!(started_at: at(9), ended_at: at(14))   # 300分
    @user.meals.create!(meal_type: :breakfast, eaten_at: at(7, 30), calories: 600, protein_g: 15, fat_g: 20, carbs_g: 80, fiber_g: 3)
    @user.meals.create!(meal_type: :lunch, eaten_at: at(12), calories: 600, protein_g: 20, fat_g: 20, carbs_g: 80, fiber_g: 4)
    @user.meals.create!(meal_type: :dinner, eaten_at: at(19), calories: 700, protein_g: 20, fat_g: 30, carbs_g: 100, fiber_g: 5)
  end

  test "spec.md 3.3 の計算例: スコアと今日の総合達成度" do
    setup_spec_example
    result = ScoreCalculator.call(user: @user, date: DAY)

    assert_equal BigDecimal("92.9"), result.sleep_score
    assert_equal BigDecimal("81.0"), result.meal_score
    assert_equal BigDecimal("50.0"), result.exercise_score
    assert_equal BigDecimal("71.4"), result.work_score
    assert_equal BigDecimal("76.5"), result.total_percent
    assert_equal 4, result.recorded_items_count
  end

  test "spec.md 3.3 の計算例: ポイントの増減と総合ポイント" do
    assert_equal 86, ScoreCalculator.point_change(BigDecimal("92.9"))
    assert_equal 62, ScoreCalculator.point_change(BigDecimal("81.0"))
    assert_equal 0, ScoreCalculator.point_change(BigDecimal("50.0"))
    assert_equal 43, ScoreCalculator.point_change(BigDecimal("71.4"))
    assert_equal 599, ScoreCalculator.total_points(sleep: 706, meal: 602, exercise: 410, work: 623)
  end

  test "100点で+100、0点で-100、ポイントは0〜1000に収める" do
    assert_equal 100, ScoreCalculator.point_change(100)
    assert_equal(-100, ScoreCalculator.point_change(0))
    assert_equal 1000, ScoreCalculator.clamp_points(1050)
    assert_equal 0, ScoreCalculator.clamp_points(-30)
  end

  test "ワーク200%: スコアは200で保存し、ポイント換算と総合では100で頭打ち" do
    @user.create_goal!(sleep_goal_type: :duration, sleep_goal_minutes: 420, work_goal_minutes: 120)
    @user.work_records.create!(started_at: at(9), ended_at: at(13))
    result = ScoreCalculator.call(user: @user, date: DAY)

    assert_equal BigDecimal("200"), result.work_score
    assert_equal 100, ScoreCalculator.point_change(result.work_score)
    assert_equal BigDecimal("20.0"), result.total_percent # ワーク 100 × 0.20 だけ
  end

  test "目標0・目標未登録・タスク0件・記録なしはすべて0点（0除算しない）" do
    result = ScoreCalculator.call(user: @user, date: DAY)
    assert_equal [ 0, 0, 0, 0 ], result.scores.values
    assert_equal 0, result.recorded_items_count

    @user.create_goal!(sleep_goal_type: :duration, sleep_goal_minutes: 420, work_goal_minutes: 0,
                       calorie_goal: 0, protein_goal_g: 0, fat_goal_g: 0, carbs_goal_g: 0, fiber_goal_g: 0)
    @user.work_records.create!(started_at: at(9), ended_at: at(10))
    @user.meals.create!(meal_type: :lunch, eaten_at: at(12), calories: 500)
    result = ScoreCalculator.call(user: @user, date: DAY)
    assert_equal 0, result.work_score
    assert_equal 0, result.meal_score
    assert_equal 0, result.exercise_score
    assert_equal 2, result.recorded_items_count
  end

  test "記録なしの日の食事は0点、栄養値の未入力は0として合計する" do
    @user.create_goal!(sleep_goal_type: :duration, sleep_goal_minutes: 420, work_goal_minutes: 60,
                       calorie_goal: 2000, protein_goal_g: 60, fat_goal_g: 60, carbs_goal_g: 300, fiber_goal_g: 20)
    assert_equal 0, ScoreCalculator.call(user: @user, date: DAY).meal_score

    @user.meals.create!(meal_type: :lunch, eaten_at: at(12), calories: 2000) # カロリーだけ100点、ほかは0点
    assert_equal BigDecimal("20.0"), ScoreCalculator.call(user: @user, date: DAY).meal_score
  end

  test "日付をまたぐ睡眠は起床した日に数え、同じ日の昼寝は合計する。時間帯の目標は 起床−就寝" do
    @user.create_goal!(sleep_goal_type: :time_range, bedtime: "23:00", wake_time: "06:00", work_goal_minutes: 60)
    @user.sleep_records.create!(slept_at: at(23, day: DAY - 1), woke_at: at(5, day: DAY)) # 360分（前日に就寝）
    @user.sleep_records.create!(slept_at: at(13), woke_at: at(13, 30))                    # 昼寝 30分
    @user.sleep_records.create!(slept_at: at(23, day: DAY), woke_at: at(6, day: DAY + 1)) # 翌日の分
    @user.sleep_records.create!(slept_at: at(23, 30))                                       # 計測中は数えない

    assert_equal BigDecimal("92.9"), ScoreCalculator.call(user: @user, date: DAY).sleep_score # 390 / 420
  end

  test "タスクを削除しても運動スコアは100で頭打ち（削除済みタスクの達成も数える）" do
    tasks = 2.times.map { |i| @user.exercise_tasks.create!(title: "タスク#{i}", position: i) }
    tasks.each { |task| task.exercise_task_completions.create!(target_date: DAY, completed_at: at(18)) }
    tasks.last.deactivate!

    assert_equal BigDecimal("100"), ScoreCalculator.call(user: @user, date: DAY).exercise_score
  end
end
