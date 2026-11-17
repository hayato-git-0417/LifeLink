# frozen_string_literal: true

class AddAvatarSelectedToUsers < ActiveRecord::Migration[7.2]
  def up
    add_column :users, :avatar_selected, :boolean, default: false, null: false

    execute <<~SQL
      UPDATE users
      SET avatar_selected = TRUE
      WHERE id IN (
        SELECT record_id
        FROM active_storage_attachments
        WHERE record_type = 'User' AND name = 'avatar'
      )
    SQL
  end

  def down
    remove_column :users, :avatar_selected
  end
end
