require "test_helper"
require "minitest/mock"

class NutritionSuggestionTest < ActiveSupport::TestCase
  setup { NutritionSuggestion.cache.clear }

  def baseline
    PersonalNutritionTargets.call(birthdate: Date.new(1996, 11, 18), gender: "male", height_cm: 170, weight_kg: 65, activity_level: "moderate", on: Date.new(2026, 11, 18))
  end

  test "範囲内のAI提案をgに換算し同じ条件では再利用する" do
    calls = 0
    client = ->(profile:, baseline:) do
      calls += 1
      assert_equal 30, profile[:age]
      assert_not profile.key?(:birthdate)
      assert_not profile.key?(:email)
      { "calorie_goal" => baseline[:calorie_goal], "protein_percent" => 17, "fat_percent" => 25, "reason" => "普段の活動量を考慮した維持の目安です。" }
    end
    OpenaiNutritionSuggestion.stub(:call, client) do
      2.times do
        result = NutritionSuggestion.call(baseline: baseline, client_id: "test")
        assert_equal "applied", result.dig(:basis, :ai_status)
        assert_in_delta result[:calorie_goal], result[:protein_goal_g] * 4 + result[:fat_goal_g] * 9 + result[:carbs_goal_g] * 4, 1
      end
    end
    assert_equal 1, calls
  end

  test "過度なカロリー削減や偏った栄養比率を適用しない" do
    [{ "calorie_goal" => 500, "protein_percent" => 17, "fat_percent" => 25 },
     { "calorie_goal" => baseline[:calorie_goal], "protein_percent" => 50, "fat_percent" => 40 }].each_with_index do |response, index|
      NutritionSuggestion.cache.clear
      OpenaiNutritionSuggestion.stub(:call, response) do
        result = NutritionSuggestion.call(baseline: baseline, client_id: index)
        assert_equal "fallback", result.dig(:basis, :ai_status)
        assert_equal baseline[:calorie_goal], result[:calorie_goal]
      end
    end
  end

  test "APIが使えない場合も基準計算で続けられる" do
    OpenaiNutritionSuggestion.stub(:call, ->(**) { raise OpenaiNutritionSuggestion::Unavailable }) do
      result = NutritionSuggestion.call(baseline: baseline, client_id: "test")
      assert_equal baseline[:calorie_goal], result[:calorie_goal]
      assert_equal "fallback", result.dig(:basis, :ai_status)
    end
  end

  test "同じ接続元から異なる体格で連続呼び出ししない" do
    OpenaiNutritionSuggestion.stub(:call, ->(**) { raise OpenaiNutritionSuggestion::Unavailable }) do
      NutritionSuggestion.call(baseline: baseline, client_id: "same")
    end
    OpenaiNutritionSuggestion.stub(:call, ->(**) { flunk "連続して有料APIを呼び出さない" }) do
      result = NutritionSuggestion.call(baseline: baseline, client_id: "same")
      assert_equal "fallback", result.dig(:basis, :ai_status)
    end
  end
end
