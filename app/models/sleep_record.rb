class SleepRecord < ApplicationRecord
  include TimedRecord

  # 集計日は起床した日（spec.md 2.1）
  timed_by start: :slept_at, finish: :woke_at, recorded_on_from: :finish, max_minutes_key: :sleep_max_minutes
end
