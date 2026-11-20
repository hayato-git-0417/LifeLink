require "test_helper"

class MealNutritionEstimateTest < ActiveSupport::TestCase
  test "エネルギーの近似に差のある公式値も機械的に書き換えない" do
    values = { "calories" => 1141, "protein_g" => 42.8, "fat_g" => 57.9, "carbs_g" => 114.9 }
    assert_equal values.symbolize_keys, MealNutritionEstimate.call(values)
  end

  test "低すぎるカロリーと高いPFCの組み合わせを自動入力しない" do
    result = MealNutritionEstimate.call({ "calories" => 500, "protein_g" => 100, "fat_g" => 100, "carbs_g" => 150 })
    MealNutritionEstimate::KEYS.each { |key| assert_nil result[key] }
    assert_includes result[:nutrition_warning], "不整合"
  end

  test "未推定をゼロにしない" do
    result = MealNutritionEstimate.call({ "calories" => 250, "protein_g" => nil, "fat_g" => nil, "carbs_g" => nil })
    assert_equal 250, result[:calories]
    assert_nil result[:protein_g]
  end

  test "負の値や単位の付いた文字列を受け入れない" do
    [-1, "42g", Float::INFINITY].each do |value|
      result = MealNutritionEstimate.call({ "calories" => 250, "protein_g" => value, "fat_g" => 1, "carbs_g" => 50 })
      assert_nil result[:calories]
      assert result[:nutrition_warning]
    end
  end
end
