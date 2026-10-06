# 移動距離の手入力の記録。運動タイマーは作らないので ended_at・duration_minutes は使わない（spec.md 2章）
class ExerciseRecord < ApplicationRecord
  belongs_to :user

  enum :record_method, { timer: 0, manual: 1 }, default: :manual, validate: true

  before_validation :fill_recorded_on

  validates :started_at, :recorded_on, presence: true
  # 移動距離の手入力にしか使わないので距離は必須
  validates :distance_km, presence: true, numericality: { greater_than: 0, less_than: 1000, allow_nil: true }
  validates :memo, length: { maximum: 255 }

  scope :between, ->(from, to) { where(recorded_on: from..to) }

  private

  def fill_recorded_on
    self.recorded_on ||= started_at&.to_date
  end
end
