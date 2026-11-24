# frozen_string_literal: true

class AddAccountIdToUsers < ActiveRecord::Migration[7.2]
  def up
    add_column :users, :account_id, :string

    User.reset_column_information
    User.find_each do |user|
      user.update_column(:account_id, "user#{user.id}")
    end

    change_column_null :users, :account_id, false
    add_index :users, :account_id, unique: true
  end

  def down
    remove_index :users, :account_id
    remove_column :users, :account_id
  end
end
