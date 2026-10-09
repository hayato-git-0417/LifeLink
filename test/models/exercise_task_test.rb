require "test_helper"

class ExerciseTaskTest < ActiveSupport::TestCase
  setup do
    @user = create_user
    @task = @user.exercise_tasks.create!(title: "腕立て伏せ100回", position: 1)
  end

  test "タスク名は必須で100文字まで" do
    assert_not @user.exercise_tasks.build(title: "").valid?
    assert_not @user.exercise_tasks.build(title: "あ" * 101).valid?
  end

  test "削除は論理削除で、過去の達成記録は残る" do
    @task.exercise_task_completions.create!(target_date: Date.new(2026, 10, 5), completed_at: Time.current)
    @task.deactivate!

    assert_not @task.reload.active?
    assert_empty @user.exercise_tasks.active
    assert_equal 1, ExerciseTaskCompletion.count
  end

  test "達成は1日1回だけ" do
    date = Date.new(2026, 10, 6)
    @task.exercise_task_completions.create!(target_date: date, completed_at: Time.current)
    assert_not @task.exercise_task_completions.build(target_date: date, completed_at: Time.current).valid?
    assert @task.exercise_task_completions.build(target_date: date + 1, completed_at: Time.current).valid?
    assert @task.completed_on?(date)
  end

  test "表示順に並ぶ" do
    first = @user.exercise_tasks.create!(title: "1キロ走る", position: 0)
    assert_equal [ first, @task ], @user.exercise_tasks.ordered.to_a
  end
end
