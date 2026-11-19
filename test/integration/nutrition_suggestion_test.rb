require "test_helper"
require "minitest/mock"

class NutritionSuggestionApiTest < ActionDispatch::IntegrationTest
  PROFILE = { birthdate: "1996-11-18", gender: "male", height_cm: 170, weight_kg: 65, activity_level: "moderate" }.freeze
  setup { NutritionSuggestion.cache.clear }

  test "登録前でもプロフィールからAI提案を取得する" do
    travel_to Time.zone.local(2026, 11, 18, 12) do
      OpenaiNutritionSuggestion.stub(:call, ->(profile:, baseline:) { { "calorie_goal" => baseline[:calorie_goal], "protein_percent" => 17, "fat_percent" => 25, "reason" => "普段の生活を考慮した目安です" } }) do
        post "/api/v1/goal/nutrition_suggestion", params: PROFILE, as: :json
        assert_response :ok
        assert_equal "applied", json.dig("nutrition_defaults", "basis", "ai_status")
        assert_equal 2740, json.dig("nutrition_defaults", "calorie_goal")
        assert_equal 0, User.count
      end
    end
  end

  test "通常の初期値取得ではAIを呼ばず活動量を反映する" do
    travel_to Time.zone.local(2026, 11, 18, 12) do
      OpenaiNutritionSuggestion.stub(:call, ->(**) { flunk "通常の表示で有料APIを呼ばない" }) do
        get "/api/v1/goal/nutrition_defaults", params: PROFILE.merge(activity_level: "low")
        assert_response :ok
        low = json.dig("nutrition_defaults", "calorie_goal")
        get "/api/v1/goal/nutrition_defaults", params: PROFILE.merge(activity_level: "high")
        assert_response :ok
        assert_operator json.dig("nutrition_defaults", "calorie_goal"), :>, low
      end
    end
  end

  test "体格や活動量が不正ならAPIを呼ばず422" do
    OpenaiNutritionSuggestion.stub(:call, ->(**) { flunk "不正な入力でAIを呼ばない" }) do
      [PROFILE.merge(activity_level: "unknown"), PROFILE.merge(height_cm: 0), PROFILE.merge(weight_kg: "abc"), PROFILE.merge(birthdate: "2999-01-01")].each do |profile|
        post "/api/v1/goal/nutrition_suggestion", params: profile, as: :json
        assert_response :unprocessable_entity
      end
    end
  end

  test "対象年齢以外には年齢別の基準を使う" do
    ChildNutritionStandards.call
    OpenaiNutritionSuggestion.stub(:call, ->(**) { flunk "対象外の年齢でAIを呼ばない" }) do
      travel_to Time.zone.local(2026, 11, 18, 12) do
        post "/api/v1/goal/nutrition_suggestion", params: PROFILE.merge(birthdate: "2011-11-18"), as: :json
        assert_response :ok
        assert_equal "not_applicable", json.dig("nutrition_defaults", "basis", "ai_status")
        assert_equal 2850, json.dig("nutrition_defaults", "calorie_goal")
      end
    end
  end

  test "活動量を新規登録で保存しプロフィール変更できる" do
    post "/api/v1/auth", params: PROFILE.merge(email: "activity@example.com", password: "password123", password_confirmation: "password123", name: "テスト", activity_level: "high"), as: :json
    assert_response :ok
    user = User.find_by!(email: "activity@example.com")
    assert_equal "high", user.activity_level
    patch "/api/v1/me", params: { user: { activity_level: "low" } }, headers: auth_headers(user), as: :json
    assert_response :ok
    assert_equal "low", json.dig("user", "activity_level")
  end
end
