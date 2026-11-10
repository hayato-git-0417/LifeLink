# 累計ポイントの増減履歴（spec.md 4.3）。作るのは EvolutionPointAwarder（記録）と EvolutionDecayProcessor（休んだ日）だけ
class EvolutionPointLog < ApplicationRecord
  belongs_to :character

  enum :reason, { recorded: 0, missed: 1 }, validate: true
  # sleep は Kernel のメソッドと同じ名前なので、項目は item_ を付けて使う（item_sleep? など）
  enum :item, { sleep: 0, meal: 1, exercise: 2, work: 3 }, prefix: true, validate: { allow_nil: true }

  validates :target_date, :amount, :points_after, :stage_after, presence: true
  validates :item, presence: true, if: :recorded?
  validates :item, absence: true, if: :missed?

  scope :recent_first, -> { order(created_at: :desc, id: :desc) }
end
