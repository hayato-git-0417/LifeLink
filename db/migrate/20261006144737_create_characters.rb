class CreateCharacters < ActiveRecord::Migration[7.2]
  def change
    create_table :characters do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.string :name, limit: 30
      t.integer :state, null: false, default: 0
      t.integer :sleep_points, null: false, default: 500
      t.integer :meal_points, null: false, default: 500
      t.integer :exercise_points, null: false, default: 500
      t.integer :work_points, null: false, default: 500
      t.integer :total_points, null: false, default: 500
      t.datetime :state_changed_at
      t.date :last_reset_on
      t.timestamps
    end
  end
end
