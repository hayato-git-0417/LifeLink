class CreateNutritionStandards < ActiveRecord::Migration[7.2]
  def change
    create_table :nutrition_standards do |t|
      t.integer :gender, null: false
      t.integer :age_from, null: false
      t.integer :age_to, null: false
      t.integer :activity_level, null: false, default: 2
      t.integer :calories, null: false
      t.decimal :protein_g, precision: 5, scale: 1
      t.decimal :fat_g, precision: 5, scale: 1
      t.decimal :carbs_g, precision: 5, scale: 1
      t.decimal :fiber_g, precision: 5, scale: 1
      t.timestamps
      t.index [:gender, :age_from, :activity_level], unique: true
    end
  end
end
