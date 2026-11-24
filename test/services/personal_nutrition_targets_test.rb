require "test_helper"

class PersonalNutritionTargetsTest < ActiveSupport::TestCase
  def inputs
    { birthdate: Date.new(1996, 11, 18), gender: "male", height_cm: 170, weight_kg: 65, activity_level: "moderate", on: Date.new(2026, 11, 18) }
  end

  test "年齢身長体重性別と活動量で維持エネルギーを計算する" do
    result = PersonalNutritionTargets.call(**inputs)
    assert_equal 2740, result[:calorie_goal]
    assert_equal 30, result.dig(:basis, :age)
    assert result.dig(:basis, :ai_eligible)
    energy = result[:protein_goal_g] * 4 + result[:fat_goal_g] * 9 + result[:carbs_goal_g] * 4
    assert_in_delta result[:calorie_goal], energy, 1
  end

  test "活動量が高いほど維持カロリーが増える" do
    calories = %w[low moderate high].map { |level| PersonalNutritionTargets.call(**inputs.merge(activity_level: level))[:calorie_goal] }
    assert_operator calories[0], :<, calories[1]
    assert_operator calories[1], :<, calories[2]
    assert_not_equal PersonalNutritionTargets.call(**inputs)[:calorie_goal], PersonalNutritionTargets.call(**inputs.merge(height_cm: 180, weight_kg: 75))[:calorie_goal]
  end

  test "未知の活動量と不正な体格を受け入れない" do
    assert_raises(ArgumentError) { PersonalNutritionTargets.call(**inputs.merge(activity_level: "unknown")) }
    assert_raises(ArgumentError) { PersonalNutritionTargets.call(**inputs.merge(weight_kg: -1)) }
    assert_raises(ArgumentError) { PersonalNutritionTargets.call(**inputs.merge(height_cm: "NaN")) }
  end
end
