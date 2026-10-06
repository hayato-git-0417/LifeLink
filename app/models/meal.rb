class Meal < ApplicationRecord
  NUTRIENT_COLUMNS = %i[calories protein_g fat_g carbs_g fiber_g].freeze

  belongs_to :user
  has_one_attached :photo

  enum :meal_type, { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }, validate: true
  # 今回は手入力だけ（spec.md 6章）なので既定は manual
  enum :input_method, { scan: 0, manual: 1 }, default: :manual, validate: true

  before_validation :fill_recorded_on

  validates :eaten_at, :recorded_on, presence: true
  validates :content, length: { maximum: 255 }
  validates(*NUTRIENT_COLUMNS, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true)

  scope :on, ->(date) { where(recorded_on: date) }
  scope :between, ->(from, to) { where(recorded_on: from..to) }

  private

  # 集計日は食べた日（日本時間）。食べた時間を直したら集計日も合わせる
  def fill_recorded_on
    self.recorded_on = eaten_at.to_date if eaten_at.present?
  end
end
