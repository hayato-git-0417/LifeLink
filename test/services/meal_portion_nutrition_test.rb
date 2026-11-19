require "test_helper"

class MealPortionNutritionTest < ActiveSupport::TestCase
  def component(name: "主菜", weight: 100, code: nil, values: { "calories" => 200, "protein_g" => 10, "fat_g" => 8, "carbs_g" => 22 })
    { "name" => name, "estimated_weight_g" => weight, "food_code" => code, "nutrients_per_100g" => values }
  end

  test "食品成分表がDB未登録でも同梱の成分表から候補を参照し保存はしない" do
    foods = nil
    assert_no_difference "FoodComposition.count" do
      foods = MealPortionNutrition.references
    end
    rice = foods.find { |food| food.food_code == "01088" }
    assert rice
    assert_equal 156, rice.calories
  end

  test "品目ごとの100g値と調理後重量を掛け算してから合計する" do
    result = MealPortionNutrition.call({ "components" => [component(weight: 150), component(weight: 200)] })
    assert_equal 700, result[:calories]
    assert_equal 35, result[:protein_g]
    assert_equal 28, result[:fat_g]
    assert_equal 77, result[:carbs_g]
    assert_equal 2, result[:portion_estimates].length
  end

  test "候補に含まれる食品コードの値はAIの密度ではなく食品成分表を使う" do
    rice = FoodComposition.create!(food_code: "01088", name: "炊いた白米", calories: 156, protein_g: 2.5, fat_g: 0.3, carbs_g: 37.1)
    result = MealPortionNutrition.call({ "components" => [component(name: "ご飯", weight: 200, code: "01088")] }, references: [rice])
    assert_equal 312, result[:calories]
    assert_equal 5, result[:protein_g]
    assert_equal 0.6, result[:fat_g]
    assert_equal 74.2, result[:carbs_g]
    assert_equal "food_composition", result[:portion_estimates][0][:source]
  end

  test "未知のコードは勝手に食品成分表に紐づけない" do
    result = MealPortionNutrition.call({ "components" => [component(code: "99999")] })
    assert_equal 200, result[:calories]
    assert_equal "ai_estimate", result[:portion_estimates][0][:source]
    assert_nil result[:portion_estimates][0][:food_code]
  end

  test "量が不明な品目を0として合計しない" do
    result = MealPortionNutrition.call({ "components" => [component, component(weight: nil)] })
    assert_nil result[:calories]
    assert_nil result[:protein_g]
    assert result[:nutrition_warning]
  end

  test "一部のカロリーが未推定なら合計カロリーも空欄にする" do
    values = { "calories" => nil, "protein_g" => 1, "fat_g" => 1, "carbs_g" => 1 }
    result = MealPortionNutrition.call({ "components" => [component, component(values: values)] })
    assert_nil result[:calories]
    assert_equal 11, result[:protein_g]
  end

  test "100g中のPFCが100gを大幅に超える矛盾を受け入れない" do
    result = MealPortionNutrition.call({ "components" => [component(values: { "calories" => 1700, "protein_g" => 100, "fat_g" => 100, "carbs_g" => 100 })] })
    assert_nil result[:calories]
    assert result[:nutrition_warning]
  end

  test "負の量や無限大や異常な品目数を受け入れない" do
    [-1, 0, Float::INFINITY, 10001].each do |weight|
      assert_nil MealPortionNutrition.call({ "components" => [component(weight: weight)] })[:calories]
    end
    assert_nil MealPortionNutrition.call({ "components" => [] })[:calories]
    assert_nil MealPortionNutrition.call({ "components" => Array.new(21) { component } })[:calories]
  end
end
