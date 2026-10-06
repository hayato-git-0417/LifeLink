require "test_helper"

class OverdueTimerCloserTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  test "上限を超えた計測中の記録だけを 開始+上限 で終了する" do
    slept_at = Time.zone.local(2026, 10, 5, 23)
    started_at = Time.zone.local(2026, 10, 6, 10)
    sleep = @user.sleep_records.create!(slept_at: slept_at)
    work = @user.work_records.create!(started_at: started_at)

    # 睡眠 16時間1分・ワーク 5時間
    closed = OverdueTimerCloser.call(user: @user, now: slept_at + 961.minutes)
    assert_equal [ sleep ], closed
    assert_equal slept_at + 16.hours, sleep.reload.woke_at
    assert_equal 960, sleep.duration_minutes
    assert_equal Date.new(2026, 10, 6), sleep.recorded_on
    assert work.reload.in_progress?

    # ワーク 12時間ちょうどはまだ、12時間1分で終了
    assert_empty OverdueTimerCloser.call(user: @user, now: started_at + 12.hours)
    OverdueTimerCloser.call(user: @user, now: started_at + 12.hours + 1.minute)
    assert_equal 720, work.reload.duration_minutes
  end

  test "他人の記録には触らない" do
    other = create_user.sleep_records.create!(slept_at: 2.days.ago)
    OverdueTimerCloser.call(user: @user)
    assert other.reload.in_progress?
  end
end
