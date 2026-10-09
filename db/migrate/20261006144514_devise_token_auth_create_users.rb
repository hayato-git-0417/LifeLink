class DeviseTokenAuthCreateUsers < ActiveRecord::Migration[7.2]
  def change
    create_table :users do |t|
      t.string :provider, null: false, default: "email"
      t.string :uid, null: false, default: ""
      t.string :encrypted_password, null: false, default: ""
      t.string :reset_password_token
      t.datetime :reset_password_sent_at
      t.boolean :allow_password_change, default: false
      t.datetime :remember_created_at
      t.string :email, null: false
      t.string :name, limit: 50, null: false
      t.integer :icon, null: false, default: 0
      t.date :birthdate, null: false
      t.integer :gender, null: false, default: 0
      t.json :tokens
      t.timestamps
      t.index :email, unique: true
      t.index [ :uid, :provider ], unique: true
      t.index :reset_password_token, unique: true
      t.index :name
    end
  end
end
