class WorkRecord < ApplicationRecord
  include TimedRecord

  # 集計日は開始した日（spec.md 2.1）
  timed_by start: :started_at, finish: :ended_at, recorded_on_from: :start, max_minutes_key: :work_max_minutes

  validates :title, length: { maximum: 100 }
end
