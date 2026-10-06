require "test_helper"

class WorkRecordTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  test "集計日は開始した日（日をまたいでも開始日）" do
    record = @user.work_records.create!(started_at: Time.zone.local(2026, 10, 5, 23), ended_at: Time.zone.local(2026, 10, 6, 1, 30))
    assert_equal Date.new(2026, 10, 5), record.recorded_on
    assert_equal 150, record.duration_minutes
  end

  test "ワーク時間は上限（12時間）まで" do
    started_at = Time.zone.local(2026, 10, 6, 8)
    assert_not @user.work_records.build(started_at: started_at, ended_at: started_at + (WorkRecord.max_minutes + 1).minutes).valid?
  end

  test "計測中のワークは1件だけ。睡眠の計測中とは別に数える" do
    @user.sleep_records.create!(slept_at: 2.hours.ago)
    @user.work_records.create!(started_at: 1.hour.ago)
    assert_not @user.work_records.build(started_at: Time.current).valid?
  end

  test "scope: in_progress / finished / between" do
    finished = @user.work_records.create!(started_at: Time.zone.local(2026, 10, 1, 9), ended_at: Time.zone.local(2026, 10, 1, 10))
    running = @user.work_records.create!(started_at: Time.zone.local(2026, 10, 3, 9))

    assert_equal [ running ], @user.work_records.in_progress.to_a
    assert_equal [ finished ], @user.work_records.finished.to_a
    assert_equal [ finished ], @user.work_records.between(Date.new(2026, 10, 1), Date.new(2026, 10, 2)).to_a
  end
end
