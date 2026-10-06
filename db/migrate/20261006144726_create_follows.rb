class CreateFollows < ActiveRecord::Migration[7.2]
  def change
    create_table :follows do |t|
      t.references :follower, null: false, foreign_key: { to_table: :users }, index: false # 複合indexで代用
      t.references :followed, null: false, foreign_key: { to_table: :users }
      t.timestamps
      t.index [:follower_id, :followed_id], unique: true
    end
  end
end
