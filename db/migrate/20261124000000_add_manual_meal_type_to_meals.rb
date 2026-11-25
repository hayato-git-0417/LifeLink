class AddManualMealTypeToMeals < ActiveRecord::Migration[7.2]
  def change
    add_column :meals, :manual_meal_type, :boolean, default: false, null: false
  end
end
