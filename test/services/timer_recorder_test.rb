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

  test "就寝時に計測中のワークを就寝時刻で終了する" do
    @work.start(at: Time.zone.local(2026, 10, 6, 21))
    result = @sleep.start(at: Time.zone.local(2026, 10, 6, 23))
    assert result.success?
    assert_equal 120, result.auto_finished.duration_minutes
    assert_equal Time.zone.local(2026, 10, 6, 23), result.auto_finished.ended_at
  end

  test "ワーク開始と同じ時刻に就寝したら、ワークは押し間違いとして消す" do
    at = Time.zone.local(2026, 10, 6, 23)
    @work.start(at: at)
    result = @sleep.start(at: at)
    assert result.success?
    assert_nil result.auto_finished
    assert_equal 0, @user.work_records.count
  end

  test "就寝に失敗したらワークの自動終了も取り消す" do
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
    assert_not @work.finish(at: at).success?
  end
end
