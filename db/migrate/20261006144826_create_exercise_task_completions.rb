class CreateExerciseTaskCompletions < ActiveRecord::Migration[7.2]
  def change
    create_table :exercise_task_completions do |t|
      t.references :exercise_task, null: false, foreign_key: true, index: false # 複合indexで代用
      t.date :target_date, null: false
      t.datetime :completed_at, null: false
      t.timestamps
      t.index [ :exercise_task_id, :target_date ], unique: true
    end
  end
end
