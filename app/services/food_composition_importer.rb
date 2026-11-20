require "csv"

class FoodCompositionImporter
  HEADERS = %w[food_code name calories protein_g fat_g carbs_g fiber_g].freeze
  UPDATABLE_COLUMNS = %i[name calories protein_g fat_g carbs_g fiber_g updated_at].freeze

  def self.call(file_path: Rails.root.join("db/data/food_composition_2020.csv"))
    new(file_path).call
  end

  def initialize(file_path)
    @file_path = file_path
  end

  def call
    raise ArgumentError, "食品成分データが見つかりません: #{@file_path}" unless File.file?(@file_path)

    records = CSV.read(@file_path, headers: true)
    headers = records.headers || []
    missing_headers = HEADERS - headers
    raise ArgumentError, "食品成分データに必要な列がありません: #{missing_headers.join(', ')}" if missing_headers.any?

    rows = records.each_with_index.map do |row, index|
      food_code = row["food_code"].to_s.strip
      name = row["name"].to_s.strip
      if food_code.blank? || name.blank?
        raise ArgumentError, "食品成分データの#{index + 2}行目に食品番号または食品名がありません"
      end

      {
        food_code: food_code,
        name: name,
        calories: numeric_value(row["calories"], index),
        protein_g: numeric_value(row["protein_g"], index),
        fat_g: numeric_value(row["fat_g"], index),
        carbs_g: numeric_value(row["carbs_g"], index),
        fiber_g: numeric_value(row["fiber_g"], index),
        created_at: Time.current,
        updated_at: Time.current
      }
    end
    raise ArgumentError, "食品成分データが空です" if rows.empty?

    FoodComposition.upsert_all(
      rows,
      update_only: UPDATABLE_COLUMNS,
      record_timestamps: false
    )
    rows.length
  end

  private

  def numeric_value(value, index)
    return nil if value.blank?

    number = Float(value)
    raise ArgumentError unless number.finite?

    number
  rescue ArgumentError, TypeError
    raise ArgumentError, "食品成分データの#{index + 2}行目に数値でない値があります"
  end
end
