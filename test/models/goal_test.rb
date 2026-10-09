require "test_helper"

class GoalTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  test "食事時刻の初期値は 7:00／12:00／19:00" do
    goal = @user.create_goal!(sleep_goal_minutes: 420).reload
    assert_equal "07:00", goal.breakfast_time.strftime("%H:%M")
    assert_equal "12:00", goal.lunch_time.strftime("%H:%M")
    assert_equal "19:00", goal.dinner_time.strftime("%H:%M")
  end

  test "時間指定では目標睡眠時間が必須で、そのまま使う" do
    assert_not @user.build_goal(sleep_goal_type: :duration).valid?
    goal = @user.build_goal(sleep_goal_type: :duration, sleep_goal_minutes: 420)
    assert_equal 420, goal.target_sleep_minutes
  end

  test "時間帯指定では就寝・起床が必須" do
    goal = @user.build_goal(sleep_goal_type: :time_range, bedtime: "00:00")
    assert_not goal.valid?
    assert goal.errors.of_kind?(:wake_time, :blank)
  end

  test "時間帯指定の目標睡眠時間 = 起床 − 就寝（日をまたぐときは +24h）" do
    assert_equal 420, @user.build_goal(sleep_goal_type: :time_range, bedtime: "00:00", wake_time: "07:00").target_sleep_minutes
    assert_equal 450, @user.build_goal(sleep_goal_type: :time_range, bedtime: "23:30", wake_time: "07:00").target_sleep_minutes
  end

  test "栄養目標・ワーク目標はマイナス不可" do
    goal = @user.build_goal(sleep_goal_minutes: 420, calorie_goal: -1, work_goal_minutes: -1)
    assert_not goal.valid?
    assert goal.errors.of_kind?(:calorie_goal, :greater_than_or_equal_to)
    assert goal.errors.of_kind?(:work_goal_minutes, :greater_than_or_equal_to)
  end
end
