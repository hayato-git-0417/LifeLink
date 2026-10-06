require "test_helper"

class SleepRecordTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  test "日付をまたぐ睡眠は起床した日（日本時間）が集計日になり、時間を計算する" do
    record = @user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 5, 23, 45))
    assert record.in_progress?
    assert_nil record.duration_minutes

    record.update!(woke_at: Time.zone.local(2026, 10, 6, 6, 15))
    assert_equal Date.new(2026, 10, 6), record.recorded_on
    assert_equal 390, record.duration_minutes
  end

  test "UTC では前日でも日本時間の日付で集計する" do
    # 日本時間 2026-10-06 08:00 = UTC 2026-10-05 23:00
    record = @user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 6, 1), woke_at: Time.zone.local(2026, 10, 6, 8))
    assert_equal Date.new(2026, 10, 6), record.recorded_on
  end

  test "起床は就寝より後" do
    record = @user.sleep_records.build(slept_at: Time.zone.local(2026, 10, 6, 7), woke_at: Time.zone.local(2026, 10, 6, 7))
    assert_not record.valid?
    assert record.errors.of_kind?(:woke_at, :must_be_after_start)
  end

  test "睡眠時間は上限（16時間）まで" do
    slept_at = Time.zone.local(2026, 10, 5, 22)
    max = SleepRecord.max_minutes
    assert @user.sleep_records.build(slept_at: slept_at, woke_at: slept_at + max.minutes).valid?
    assert_not @user.sleep_records.build(slept_at: slept_at, woke_at: slept_at + (max + 1).minutes).valid?
  end

  test "計測中の睡眠は1件だけ" do
    @user.sleep_records.create!(slept_at: 1.hour.ago)
    second = @user.sleep_records.build(slept_at: Time.current)
    assert_not second.valid?
    assert second.errors.of_kind?(:base, :already_in_progress)

    # 他の人の計測中は関係ない
    assert create_user.sleep_records.build(slept_at: Time.current).valid?
  end

  test "作成時の記録方法は timer" do
    assert @user.sleep_records.create!(slept_at: Time.current).timer?
  end
end
