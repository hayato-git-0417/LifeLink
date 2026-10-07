class CreateDailyAchievements < ActiveRecord::Migration[7.2]
  def change
    create_table :daily_achievements do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.date :target_date, null: false
      t.decimal :sleep_score, precision: 5, scale: 1, null: false, default: 0
      t.decimal :meal_score, precision: 5, scale: 1, null: false, default: 0
      t.decimal :exercise_score, precision: 5, scale: 1, null: false, default: 0
      t.decimal :work_score, precision: 5, scale: 1, null: false, default: 0
      t.integer :sleep_change, null: false, default: 0
      t.integer :meal_change, null: false, default: 0
      t.integer :exercise_change, null: false, default: 0
      t.integer :work_change, null: false, default: 0
      t.integer :sleep_points, null: false, default: 0
      t.integer :meal_points, null: false, default: 0
      t.integer :exercise_points, null: false, default: 0
      t.integer :work_points, null: false, default: 0
      t.integer :total_points, null: false, default: 0
      t.integer :recorded_items_count, null: false, default: 0
      t.datetime :finalized_at
      t.timestamps
      t.index [ :user_id, :target_date ], unique: true
    end
  end
end
