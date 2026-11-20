# 正解がある写真だけで誤差を測る。推定不能を0と扱わず、取得率も併記する。
class MealNutritionAccuracy
  KEYS = MealNutritionEstimate::KEYS

  def self.number(value)
    return nil if value.nil? || value.to_s.strip.empty?
    number = Float(value)
    number if number.finite? && number >= 0
  rescue ArgumentError, TypeError
    nil
  end

  def self.compare(estimate, reference)
    KEYS.to_h do |key|
      expected = number(reference[key.to_s] || reference[key])
      actual = number(estimate[key] || estimate[key.to_s])
      error = expected && actual ? actual - expected : nil
      [key, { reference: expected, estimate: actual, error: error, absolute_error: error&.abs,
              percentage_error: expected&.positive? && error ? error.abs / expected * 100 : nil }]
    end
  end

  def self.summary(comparisons)
    KEYS.to_h do |key|
      referenced = comparisons.map { |row| row.fetch(key) }.select { |row| !row[:reference].nil? }
      available = referenced.select { |row| !row[:estimate].nil? }
      percentages = available.filter_map { |row| row[:percentage_error] }
      [key, {
        reference_count: referenced.size, predicted_count: available.size,
        missing_count: referenced.size - available.size,
        coverage_percent: referenced.any? ? (available.size.fdiv(referenced.size) * 100).round(2) : nil,
        mean_absolute_error: available.any? ? (available.sum { |row| row[:absolute_error] } / available.size).round(3) : nil,
        mean_bias: available.any? ? (available.sum { |row| row[:error] } / available.size).round(3) : nil,
        mean_absolute_percentage_error: percentages.any? ? (percentages.sum / percentages.size).round(3) : nil
      }]
    end
  end
end
