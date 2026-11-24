class FoodComposition < ApplicationRecord
  has_many :meal_food_items, dependent: :restrict_with_exception

  validates :food_code, :name, presence: true
  validates :food_code, uniqueness: true
end
