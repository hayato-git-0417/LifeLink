class CreateMeals < ActiveRecord::Migration[7.2]
  def change
    create_table :meals do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.integer :meal_type, null: false, default: 0
      t.datetime :eaten_at, null: false
      t.string :content
      t.integer :calories
      t.decimal :protein_g, precision: 6, scale: 1
      t.decimal :fat_g, precision: 6, scale: 1
      t.decimal :carbs_g, precision: 6, scale: 1
      t.decimal :fiber_g, precision: 6, scale: 1
      t.text :comment
      t.integer :input_method, null: false, default: 0
      t.date :recorded_on, null: false
      t.timestamps
      t.index [ :user_id, :recorded_on ]
      t.index [ :user_id, :eaten_at ]
    end
  end
end
