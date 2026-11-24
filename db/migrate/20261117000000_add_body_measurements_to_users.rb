class AddBodyMeasurementsToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :height_cm, :decimal, precision: 5, scale: 1
    add_column :users, :weight_kg, :decimal, precision: 5, scale: 1
  end
end
