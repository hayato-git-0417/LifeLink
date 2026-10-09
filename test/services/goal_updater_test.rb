require "test_helper"

class GoalUpdaterTest < ActiveSupport::TestCase
  GOAL = {
    sleep_goal_type: "duration", sleep_goal_minutes: 420, work_goal_minutes: 420,
    calorie_goal: 2200, protein_goal_g: 60, fat_goal_g: 60, carbs_goal_g: 300, fiber_goal_g: 21,
    breakfast_time: "07:00", lunch_time: "12:00", dinner_time: "19:00"
  }.freeze

  setup do
    @user = create_user
  end

  def update(goal: GOAL, tasks: [ { title: "1キロ走る" } ])
    GoalUpdater.call(user: @user, goal_params: goal, tasks_params: tasks)
  end

  test "目標とタスクをまとめて保存する。タスクの順番は配列の順" do
    result = update(tasks: [ { title: "腕立て伏せ100回" }, { title: "1キロ走る" } ])

    assert result.success?, result.errors.inspect
    assert_equal 420, @user.reload.goal.sleep_goal_minutes
    assert_equal [ "腕立て伏せ100回", "1キロ走る" ], @user.exercise_tasks.active.ordered.pluck(:title)
  end

  test "2回目は同じ目標を更新し、送られなかったタスクは論理削除、id ありは名前と順番を更新" do
    update(tasks: [ { title: "A" }, { title: "B" } ])
    a, b = @user.exercise_tasks.ordered.to_a

    result = update(goal: GOAL.merge(sleep_goal_minutes: 480), tasks: [ { title: "C" }, { id: a.id, title: "A2" } ])

    assert result.success?, result.errors.inspect
    assert_equal 1, Goal.where(user: @user).count
    assert_equal 480, @user.reload.goal.sleep_goal_minutes
    assert_equal %w[C A2], @user.exercise_tasks.active.ordered.pluck(:title)
    assert_not b.reload.active?
  end

  test "名前が空の行は無視し、有効なタスクが0件ならエラー（何も保存しない）" do
    result = update(tasks: [ { title: "  " }, { title: "" } ])

    assert_not result.success?
    assert_includes result.errors, I18n.t("activerecord.errors.messages.exercise_tasks_required")
    assert_nil @user.reload.goal
  end

  test "目標設定では栄養・ワーク・食事時刻が必須" do
    result = update(goal: GOAL.merge(calorie_goal: nil, work_goal_minutes: nil))

    assert_not result.success?
    assert_equal 2, result.errors.size, result.errors.inspect
    assert_nil @user.reload.goal
  end

  test "時間帯指定は就寝・起床が必須" do
    result = update(goal: GOAL.merge(sleep_goal_type: "time_range", sleep_goal_minutes: nil, bedtime: "00:00"))
    assert_not result.success?

    result = update(goal: GOAL.merge(sleep_goal_type: "time_range", sleep_goal_minutes: nil, bedtime: "00:00", wake_time: "07:00"))
    assert result.success?, result.errors.inspect
    assert_equal 420, @user.reload.goal.target_sleep_minutes
  end

  test "他人のタスクの id を送るとエラーになり、そのタスクは変わらない" do
    other = create_user
    other_task = other.exercise_tasks.create!(title: "他人のタスク")

    result = update(tasks: [ { id: other_task.id, title: "乗っ取り" } ])

    assert_not result.success?
    assert_equal "他人のタスク", other_task.reload.title
    assert_nil @user.reload.goal
  end
end
