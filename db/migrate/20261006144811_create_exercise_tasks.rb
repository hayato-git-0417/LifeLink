class CreateExerciseTasks < ActiveRecord::Migration[7.2]
  def change
    create_table :exercise_tasks do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.string :title, limit: 100, null: false
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
      t.index [ :user_id, :position ]
    end
  end
end
