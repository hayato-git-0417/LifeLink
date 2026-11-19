class MealFoodItem < ApplicationRecord
  belongs_to :meal
  belongs_to :food_composition

  validates :weight_g, numericality: { greater_than: 0 }
end
