require "test_helper"

class MealClassificationTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @headers = auth_headers(@user)
  end

  def add_meal(time, type = "snack")
    post "/api/v1/meals", params: { meal: { meal_type: type, eaten_at: time, content: "食事" } }, headers: @headers, as: :json
  end

  test "朝昼夕は食べた時刻から自動判定し各1日1件まで" do
    [["07:00", "breakfast"], ["12:00", "lunch"], ["19:00", "dinner"]].each do |time, type|
      add_meal("2026-11-16T#{time}:00+09:00")
      assert_response :created
      assert_equal type, json.dig("meal", "meal_type")
      assert_no_difference "Meal.count" do
        add_meal("2026-11-16T#{time}:00+09:00")
      end
      assert_response :unprocessable_entity
      assert_includes json.fetch("errors").join, "1日1回"
    end
    add_meal("2026-11-17T07:00:00+09:00")
    assert_response :created
  end

  test "時間帯の外は指定された区分に関係なく間食で複数回登録できる" do
    2.times do
      add_meal("2026-11-16T15:00:00+09:00", "lunch")
      assert_response :created
      assert_equal "snack", json.dig("meal", "meal_type")
    end
  end

  test "本人の編集は可能で日付変更による重複は拒否する" do
    add_meal("2026-11-16T07:00:00+09:00")
    id = json.dig("meal", "id")
    patch "/api/v1/meals/#{id}", params: { meal: { content: "修正後" } }, headers: @headers, as: :json
    assert_response :ok
    add_meal("2026-11-17T07:00:00+09:00")
    patch "/api/v1/meals/#{id}", params: { meal: { eaten_at: "2026-11-17T08:00:00+09:00" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal Date.new(2026, 11, 16), Meal.find(id).recorded_on
    patch "/api/v1/meals/#{id}", params: { meal: { eaten_at: "2026-11-16T15:00:00+09:00" } }, headers: @headers, as: :json
    assert_response :ok
    assert_equal "snack", json.dig("meal", "meal_type")
  end

  test "目標の時刻と日付境界は日本時間で判定する" do
    @user.create_goal!(sleep_goal_minutes: 420, breakfast_time: "00:30", lunch_time: "12:00", dinner_time: "19:00")
    add_meal("2026-11-16T14:30:00Z")
    assert_response :created
    assert_equal "breakfast", json.dig("meal", "meal_type")
    assert_equal "2026-11-16", json.dig("meal", "recorded_on")
    add_meal("2026-11-16T15:30:00Z")
    assert_response :created
    assert_equal "2026-11-17", json.dig("meal", "recorded_on")
  end

  test "別のユーザーの同じ日の同区分は登録できる" do
    add_meal("2026-11-16T12:00:00+09:00")
    @headers = auth_headers(create_user)
    add_meal("2026-11-16T12:00:00+09:00")
    assert_response :created
  end
  test "前後1時間の境界を含みその外側は間食になる" do
    [["05:59", "snack"], ["06:00", "breakfast"], ["08:00", "breakfast"], ["08:01", "snack"]].each_with_index do |(time, type), index|
      add_meal("2026-11-#{10 + index}T#{time}:00+09:00")
      assert_response :created
      assert_equal type, json.dig("meal", "meal_type")
    end
  end
end
