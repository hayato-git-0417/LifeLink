# 運動の記録。ホームの運動タイマーの記録（timer: duration_minutes と memo にタスク名）と、移動距離の手入力（manual: distance_km）の2種類
class ExerciseRecord < ApplicationRecord
  belongs_to :user

  enum :record_method, { timer: 0, manual: 1 }, default: :manual, validate: true

  before_validation :fill_recorded_on

  validates :started_at, :recorded_on, presence: true
  # タイマーの記録は運動時間（1分以上）が必須
  validates :duration_minutes, presence: true, numericality: { only_integer: true, greater_than: 0 }, if: :timer?
  validates :memo, length: { maximum: 255 }

  scope :between, ->(from, to) { where(recorded_on: from..to) }

  private

  def fill_recorded_on
    self.recorded_on ||= started_at&.to_date
  end
end
