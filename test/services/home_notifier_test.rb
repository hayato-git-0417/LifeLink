require "test_helper"

class HomeNotifierTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  def notify(state: "normal", bedtime_reminder: false, tasks_remaining: false)
    resolved = CharacterStateResolver::Result.new(state: state, bedtime_reminder: bedtime_reminder, tasks_remaining: tasks_remaining)
    HomeNotifier.call(user: @user, resolved: resolved)
  end

  test "キャラの状態の通知は空腹だけ・1日1回（ほかの状態では作らない）" do
    travel_to Time.zone.local(2026, 10, 6, 9) do
      assert_equal 1, notify(state: "hungry").size
      assert_empty notify(state: "hungry")
      %w[normal sleeping studying exercising].each { |state| assert_empty notify(state: state) }
    end
    assert_equal %w[character], @user.notifications.pluck(:notification_type)

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
