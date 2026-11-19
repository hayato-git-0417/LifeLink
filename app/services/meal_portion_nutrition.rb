require "csv"

# 食品の種類と調理後重量を分離し、100gあたりの値×重量/100をサーバーで計算する。
class MealPortionNutrition
  REFERENCE_CODES = %w[01088 01026 01174 01034 01039 01064 02018 04032 04033 06061 06264 07107 10131 10136 10156 11222 11225 11287 11288 11289 11290 11276 11279 12005 13003 13025 14001 14005 17042].freeze
  KEYS = MealNutritionEstimate::KEYS
  MAX_COMPONENTS = 20

  def self.references
    foods = FoodComposition.where(food_code: REFERENCE_CODES).order(:food_code).to_a
    missing = REFERENCE_CODES - foods.map(&:food_code)
    path = Rails.root.join("db/data/food_composition_2020.csv")
    if missing.any? && File.file?(path)
      CSV.foreach(path, headers: true) do |row|
        next unless missing.include?(row["food_code"])
        foods << FoodComposition.new(food_code: row["food_code"], name: row["name"], **KEYS.index_with { |key| row[key.to_s].presence })
      end
    end
    foods.sort_by(&:food_code)
  end

  def self.call(result, references: [])
    # 古いレスポンスにも対応するが、新しい画像解析ではcomponentsが必須。
    unless result.key?("components")
      return MealNutritionEstimate.call(result).merge(portion_estimates: [], raw_nutrients: KEYS.index_with { |key| result[key.to_s] })
    end

    rows = result["components"]
    unless rows.is_a?(Array) && rows.size.between?(1, MAX_COMPONENTS)
      return unavailable("品目と量を推定できませんでした。料理名・量を内容欄に追記して再解析してください。")
    end
    foods = references.index_by(&:food_code)
    portions = rows.map do |row|
      row = {} unless row.is_a?(Hash)
      food = foods[row["food_code"]]
      per_100g = food ? KEYS.index_with { |key| food.public_send(key)&.to_f } : (row["nutrients_per_100g"].is_a?(Hash) ? row["nutrients_per_100g"].symbolize_keys.slice(*KEYS) : {})
      macros = %i[protein_g fat_g carbs_g].map { |key| per_100g[key] }
      impossible_mass = macros.all? { |value| value.is_a?(Numeric) && value.finite? } && macros.sum > 105
      checked = impossible_mass ? KEYS.index_with { nil } : MealNutritionEstimate.call(per_100g.stringify_keys).slice(*KEYS)
      weight = row["estimated_weight_g"]
      weight = nil unless weight.is_a?(Numeric) && weight.finite? && weight.positive? && weight <= 10_000
      {
        name: row["name"].to_s.strip[0, 100], weight_g: weight,
        food_code: food&.food_code, reference_name: food&.name,
        source: food ? "food_composition" : "ai_estimate",
        nutrients_per_100g: KEYS.index_with { |key| checked[key] }
      }
    end
    totals = KEYS.to_h do |key|
      known = portions.all? { |portion| portion[:weight_g] && !portion[:nutrients_per_100g][key].nil? }
      value = known ? portions.sum { |portion| portion[:nutrients_per_100g][key] * portion[:weight_g] / 100 } : nil
      [key, value]
    end
    checked = MealNutritionEstimate.call(totals.stringify_keys)
    missing = totals.values.any?(&:nil?)
    checked[:nutrition_warning] ||= "一部の品目の量・栄養値が不明です。不明な項目は過少表示を避けるため合計を空欄にしています。" if missing
    checked.merge(
      portion_estimates: portions, raw_nutrients: totals, raw_components: rows,
      nutrition_basis: if portions.all? { |portion| portion[:source] == "food_composition" }
                         "食品成分表 × 写真からの推定重量"
                       elsif portions.none? { |portion| portion[:source] == "food_composition" }
                         "AIの100gあたり推定値 × 写真からの推定重量"
                       else
                         "食品成分表・AIの100gあたり推定値 × 写真からの推定重量"
                       end
    )
  end

  def self.unavailable(message)
    KEYS.index_with { nil }.merge(nutrition_warning: message, portion_estimates: [], raw_nutrients: KEYS.index_with { nil })
  end
end
