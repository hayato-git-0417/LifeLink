# 年齢・性別ごとの食事目標の初期値（日本人の食事摂取基準（2025年版））。値は db/seeds.rb で入れる
class NutritionStandard < ApplicationRecord
  enum :gender, { male: 1, female: 2, other: 3 }, validate: true
  enum :activity_level, { low: 1, moderate: 2, high: 3 }, validate: true

  validates :age_from, :age_to, :calories, presence: true
  validates :age_from, uniqueness: { scope: %i[gender activity_level] }
  validates :age_to, comparison: { greater_than_or_equal_to: :age_from }, allow_nil: true

  scope :for_age, ->(age) { where("age_from <= ? AND age_to >= ?", age, age) }
end
