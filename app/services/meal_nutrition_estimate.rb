# AIの値を一律に増減せず、単位・カロリーとPFCの大きな矛盾だけを検出する。
class MealNutritionEstimate
  KEYS = %i[calories protein_g fat_g carbs_g].freeze
  ENERGY_FACTORS = { protein_g: 4, fat_g: 9, carbs_g: 4 }.freeze
  RELATIVE_TOLERANCE = 0.25
  ABSOLUTE_TOLERANCE_KCAL = 50

  def self.call(result)
    nutrients = KEYS.index_with { |key| result[key.to_s] }
    invalid = nutrients.values.compact.any? { |value| !value.is_a?(Numeric) || !value.finite? || value.negative? }
    complete = !invalid && nutrients.values.none?(&:nil?)
    energy = complete ? ENERGY_FACTORS.sum { |key, factor| nutrients[key] * factor } : nil
    inconsistent = energy && (energy - nutrients[:calories]).abs > [ABSOLUTE_TOLERANCE_KCAL, nutrients[:calories] * RELATIVE_TOLERANCE].max
    if invalid || inconsistent
      return KEYS.index_with { nil }.merge(nutrition_warning: "写真からの栄養推定に不整合があるため自動入力しませんでした。店舗の公式値または食品と量から入力してください。")
    end

    nutrients.to_h { |key, value| [key, value&.round(key == :calories ? 0 : 1)] }
  end
end
