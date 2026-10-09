class CreateCharacterStateLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :character_state_logs do |t|
      t.references :character, null: false, foreign_key: true, index: false # 複合indexで代用
      t.integer :state, null: false
      t.string :reason
      t.date :target_date, null: false
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.timestamps
      t.index [:character_id, :started_at]
      t.index [:character_id, :target_date]
    end
  end
end
