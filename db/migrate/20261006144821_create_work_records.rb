class CreateWorkRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :work_records do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.string :title, limit: 100
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.integer :duration_minutes
      t.integer :record_method, null: false, default: 0
      t.date :recorded_on, null: false
      t.timestamps
      t.index [ :user_id, :recorded_on ]
    end
  end
end
