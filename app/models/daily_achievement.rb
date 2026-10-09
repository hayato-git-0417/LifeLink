class DailyAchievement < ApplicationRecord
  SCORE_COLUMNS = %i[sleep_score meal_score exercise_score work_score].freeze

  belongs_to :user

  validates :target_date, presence: true, uniqueness: { scope: :user_id }
  # ワークスコアは上限なしで保存する（spec.md 3.1）ので、下限だけ見る
  validates(*SCORE_COLUMNS, numericality: { greater_than_or_equal_to: 0 })
  validates :recorded_items_count, numericality: { only_integer: true, in: 0..4 }

  scope :finalized, -> { where.not(finalized_at: nil) }
  scope :unfinalized, -> { where(finalized_at: nil) }
  scope :between, ->(from, to) { where(target_date: from..to) }

  def finalized?
    finalized_at.present?
  end
end
