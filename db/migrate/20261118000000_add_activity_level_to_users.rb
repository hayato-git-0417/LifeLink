class AddActivityLevelToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :activity_level, :integer
    reversible do |direction|
      direction.up { execute "UPDATE users SET activity_level = 1" }
    end
    change_column_null :users, :activity_level, false
  end
end
