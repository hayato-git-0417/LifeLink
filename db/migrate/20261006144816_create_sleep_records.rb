class CreateSleepRecords < ActiveRecord::Migration[7.2]
  def change
    create_table :sleep_records do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.datetime :slept_at, null: false
      t.datetime :woke_at
      t.integer :duration_minutes
      t.integer :record_method, null: false, default: 0
      t.date :recorded_on, null: false
      t.timestamps
      t.index [:user_id, :recorded_on]
      t.index [:user_id, :slept_at]
    end
  end
end
