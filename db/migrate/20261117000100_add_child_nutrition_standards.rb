class AddChildNutritionStandards < ActiveRecord::Migration[7.2]
  def up
    ChildNutritionStandards.call
  end

  def down
    NutritionStandard.moderate.where(age_from: 1..17).delete_all
  end
end
