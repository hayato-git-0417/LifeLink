require "test_helper"

class FoodCompositionsTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user(password: "password123", password_confirmation: "password123")
    @headers = auth_headers(@user)
  end

  test "食品名で検索し、食品成分の4項目を返す" do
    food = FoodComposition.create!(
      food_code: "01001",
      name: "ごはん　精白米",
      calories: 156,
      protein_g: 2.5,
      fat_g: 0.3,
      carbs_g: 37.1,
      fiber_g: 1.5
    )
    FoodComposition.create!(food_code: "01002", name: "りんご", calories: 53)

    get "/api/v1/food_compositions", params: { q: "ごはん" }, headers: @headers

    assert_response :ok
    assert_equal [ food.id ], json["foods"].map { |item| item["id"] }
    assert_equal 37.1, json.dig("foods", 0, "carbs_g")
    assert_not json.fetch("foods").first.key?("fiber_g")
  end

  test "未ログインでは食品を検索できない" do
    get "/api/v1/food_compositions", params: { q: "ごはん" }

    assert_response :unauthorized
  end
end
