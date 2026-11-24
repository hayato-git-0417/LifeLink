class CreateFoodCompositionsAndMealFoodItems < ActiveRecord::Migration[7.2]
  def change
    create_table :food_compositions do |t|
      t.string :food_code, null: false
      t.string :name, null: false
      t.decimal :calories, precision: 7, scale: 2
      t.decimal :protein_g, precision: 8, scale: 3
      t.decimal :fat_g, precision: 8, scale: 3
      t.decimal :carbs_g, precision: 8, scale: 3
      t.decimal :fiber_g, precision: 8, scale: 3
      t.timestamps
    end
    add_index :food_compositions, :food_code, unique: true
    add_index :food_compositions, :name

    create_table :meal_food_items do |t|
      t.references :meal, null: false, foreign_key: true
      t.references :food_composition, null: false, foreign_key: true
      t.decimal :weight_g, precision: 7, scale: 1, null: false
      t.timestamps
    end
  end
end
