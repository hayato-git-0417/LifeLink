require "test_helper"

class TimerRecorderTest < ActiveSupport::TestCase
  setup do
    @user = create_user
    @sleep = TimerRecorder.new(user: @user, kind: :sleep)
    @work = TimerRecorder.new(user: @user, kind: :work)
  end

  test "開始→終了で時間を計算し、記録方法は timer" do
    started = Time.zone.local(2026, 10, 6, 9)
    assert @work.start(at: started).success?
    result = @work.finish(at: started + 95.minutes)
    assert result.success?
    assert_equal 95, result.record.duration_minutes
    assert result.record.timer?
  end

  test "ワーク中は睡眠を開始できない" do
    @work.start(at: Time.zone.local(2026, 10, 6, 21))
    result = @sleep.start(at: Time.zone.local(2026, 10, 6, 23))
    assert_not result.success?
    assert_equal [ "ワーク中は睡眠を開始できません" ], result.errors
    assert @user.work_records.in_progress.exists?
  end

  test "ワーク開始と同じ時刻でも睡眠を開始できない" do
    at = Time.zone.local(2026, 10, 6, 23)
    @work.start(at: at)
    result = @sleep.start(at: at)
    assert_not result.success?
    assert_equal 1, @user.work_records.count
    assert @user.work_records.in_progress.exists?
  end

  test "別の睡眠記録が進行中ならワークを残して睡眠を開始できない" do
    @work.start(at: Time.zone.local(2026, 10, 6, 21))
    @user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 6, 22)) # すでに睡眠中（ワーク中には通常ありえない状態）
    result = @sleep.start(at: Time.zone.local(2026, 10, 6, 23))
    assert_not result.success?
    assert @user.work_records.in_progress.exists?
  end

  test "睡眠中はワークを開始できない" do
    @sleep.start(at: 1.hour.ago)
    result = @work.start
    assert_not result.success?
    assert_equal [ "睡眠中はワークを開始できません" ], result.errors
  end

  test "開始と同じ時刻に終了はできない" do
    at = Time.zone.local(2026, 10, 6, 9)
    @work.start(at: at)
    result = @work.finish(at: at)
    assert result.success?
    assert result.discarded
    assert_equal 0, @user.work_records.count
  end
end
