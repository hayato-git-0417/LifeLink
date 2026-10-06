class CreateCharacterAnimations < ActiveRecord::Migration[7.2]
  def change
    create_table :character_animations do |t|
      t.integer :state, null: false
      t.string :gif_path, null: false
      t.string :description, limit: 100
      t.timestamps
      t.index :state, unique: true
    end
  end
end
