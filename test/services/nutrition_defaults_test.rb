require "test_helper"

class NutritionDefaultsTest < ActiveSupport::TestCase
  setup do
    # 18〜29歳と30〜49歳の2区分だけ用意する
    [
      [ :male, 18, 29, 2600, 65, 72.2, 373.8, 20 ],
      [ :male, 30, 49, 2750, 65, 76.4, 395.3, 22 ],
      [ :female, 18, 29, 1950, 50, 54.2, 280.3, 18 ],
      [ :female, 30, 49, 2050, 50, 56.9, 294.7, 18 ]
    ].each do |gender, from, to, kcal, p, f, c, fiber|
      NutritionStandard.create!(gender: gender, age_from: from, age_to: to, activity_level: :moderate,
                                calories: kcal, protein_g: p, fat_g: f, carbs_g: c, fiber_g: fiber)
    end
    @today = Date.new(2026, 10, 6)
  end

  test "年齢・性別に合う区分の値を返す（20歳男性）" do
    result = NutritionDefaults.call(birthdate: Date.new(2006, 4, 1), gender: "male", on: @today)
    assert_equal 2600, result[:calorie_goal]
    assert_equal 65.0, result[:protein_goal_g]
    assert_equal 20.0, result[:fiber_goal_g]
    assert_equal "07:00", result[:breakfast_time]
    assert_equal 20, result[:basis][:age]
  end

  test "年齢の区分の境目（30歳の誕生日から次の区分）" do
    assert_equal 2600, NutritionDefaults.call(birthdate: Date.new(1996, 10, 7), gender: "male", on: @today)[:calorie_goal]
    assert_equal 2750, NutritionDefaults.call(birthdate: Date.new(1996, 10, 6), gender: "male", on: @today)[:calorie_goal]
  end

  test "性別が未回答・その他は男女の平均" do
    %w[unspecified other].each do |gender|
      result = NutritionDefaults.call(birthdate: Date.new(2006, 4, 1), gender: gender, on: @today)
      assert_equal 2275, result[:calorie_goal] # (2600 + 1950) / 2
      assert_equal 57.5, result[:protein_goal_g]
      assert_equal 19.0, result[:fiber_goal_g]
      assert result[:basis][:averaged]
    end
  end

  test "18歳未満は一番若い区分、基準より上の年齢は一番上の区分" do
    assert_equal 1950, NutritionDefaults.call(birthdate: Date.new(2012, 1, 1), gender: "female", on: @today)[:calorie_goal]
    assert_equal 2050, NutritionDefaults.call(birthdate: Date.new(1960, 1, 1), gender: "female", on: @today)[:calorie_goal]
  end

  test "基準のデータがなければ nil" do
    NutritionStandard.delete_all
    assert_nil NutritionDefaults.call(birthdate: Date.new(2006, 4, 1), gender: "male", on: @today)
  end
end
