class CreateGoals < ActiveRecord::Migration[7.2]
  def change
    create_table :goals do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.integer :sleep_goal_type, null: false, default: 0
      t.integer :sleep_goal_minutes
      t.time :bedtime
      t.time :wake_time
      t.integer :work_goal_minutes
      t.integer :calorie_goal
      t.decimal :protein_goal_g, precision: 5, scale: 1
      t.decimal :fat_goal_g, precision: 5, scale: 1
      t.decimal :carbs_goal_g, precision: 5, scale: 1
      t.decimal :fiber_goal_g, precision: 5, scale: 1
      t.time :breakfast_time
      t.time :lunch_time
      t.time :dinner_time
      t.timestamps
    end
  end
end
