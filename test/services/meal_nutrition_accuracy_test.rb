require "test_helper"

class MealNutritionAccuracyTest < ActiveSupport::TestCase
  test "誤差の方向と絶対誤差と百分率を別々に算出する" do
    row = MealNutritionAccuracy.compare({ calories: 800, protein_g: 60 }, { "calories" => "1000", "protein_g" => "40" })
    assert_equal(-200, row[:calories][:error])
    assert_equal 200, row[:calories][:absolute_error]
    assert_equal 20, row[:calories][:percentage_error]
    assert_equal 50, row[:protein_g][:percentage_error]
  end

  test "未推定を0として誤差計算せず取得率にも反映する" do
    rows = [MealNutritionAccuracy.compare({ calories: 800 }, { calories: 1000 }), MealNutritionAccuracy.compare({}, { calories: 1000 })]
    summary = MealNutritionAccuracy.summary(rows)[:calories]
    assert_equal 2, summary[:reference_count]
    assert_equal 1, summary[:missing_count]
    assert_equal 50, summary[:coverage_percent]
    assert_equal 200, summary[:mean_absolute_error]
    assert_equal(-200, summary[:mean_bias])
  end

  test "正解0は百分率から除外し絶対誤差の対象とする" do
    row = MealNutritionAccuracy.compare({ fat_g: 2 }, { fat_g: 0 })
    assert_equal 2, row[:fat_g][:absolute_error]
    assert_nil row[:fat_g][:percentage_error]
    assert_nil MealNutritionAccuracy.summary([])[:calories][:mean_absolute_error]
  end
end
