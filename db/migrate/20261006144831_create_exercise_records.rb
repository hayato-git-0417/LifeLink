class CreateExerciseRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :exercise_records do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.integer :duration_minutes
      t.decimal :distance_km, precision: 5, scale: 2
      t.integer :record_method, null: false, default: 0
      t.string :memo
      t.date :recorded_on, null: false
      t.timestamps
      t.index [:user_id, :recorded_on]
    end
  end
end
