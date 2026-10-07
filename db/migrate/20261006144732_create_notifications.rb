class CreateNotifications < ActiveRecord::Migration[7.2]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true, index: false # 複合indexで代用
      t.references :actor, foreign_key: { to_table: :users }
      t.integer :notification_type, null: false, default: 0
      t.string :title, limit: 100, null: false
      t.string :body
      t.references :notifiable, polymorphic: true
      t.datetime :read_at
      t.timestamps
      t.index [ :user_id, :read_at ]
      t.index [ :user_id, :created_at ]
    end
  end
end
