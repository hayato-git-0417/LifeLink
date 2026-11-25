require "test_helper"

class ManualMealTypeTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @headers = auth_headers(@user)
  end

  test "manual meal type takes precedence over time-based classification" do
    post "/api/v1/meals", params: {
      meal: {
        meal_type: "lunch",
        manual_meal_type: true,
        eaten_at: "2026-11-16T15:00:00+09:00",
        content: "manual meal type"
      }
    }, headers: @headers, as: :json

    assert_response :created
    assert_equal "lunch", json.dig("meal", "meal_type")
    assert_equal true, json.dig("meal", "manual_meal_type")
  end
end
