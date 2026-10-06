require "test_helper"

class HomeNotifierTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  def notify(state: "normal", bedtime_reminder: false, tasks_remaining: false)
    resolved = CharacterStateResolver::Result.new(state: state, bedtime_reminder: bedtime_reminder, tasks_remaining: tasks_remaining)
    HomeNotifier.call(user: @user, resolved: resolved)
  end

  test "キャラの状態の通知は状態ごとに1日1回（睡眠不足と空腹は別に数える）" do
    travel_to Time.zone.local(2026, 10, 6, 9) do
      assert_equal 1, notify(state: "sleep_deprived").size
      assert_empty notify(state: "sleep_deprived")
      assert_equal 1, notify(state: "hungry").size
      assert_empty notify(state: "full")
    end
    assert_equal %w[character character], @user.notifications.pluck(:notification_type)

    travel_to Time.zone.local(2026, 10, 7, 9) do
      assert_equal 1, notify(state: "hungry").size # 次の日はまた作る
    end
  end

  test "就寝リマインドと未完了タスクは1日1回" do
    travel_to Time.zone.local(2026, 10, 6, 23, 40) do
      created = notify(bedtime_reminder: true, tasks_remaining: true)
      assert_equal %w[reminder task], created.map(&:notification_type)
      assert_empty notify(bedtime_reminder: true, tasks_remaining: true)
    end
    assert_equal 2, @user.notifications.unread.count
  end
end
