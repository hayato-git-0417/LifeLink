require "test_helper"

# 進化のテストパネルの API（開発用。development・test だけにルートがある）
class DevEvolutionTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
  end

  def headers
    auth_headers(@user)
  end

  test "未ログインは 401" do
    get "/api/v1/dev/evolution"
    assert_response :unauthorized
  end

  test "今の状態と、段階ごとの画像（段階5は画像ができるまで段階4）を返す" do
    get "/api/v1/dev/evolution", headers: headers
    assert_response :ok
    assert_nil json["result"]
    assert_equal 0, json.dig("evolution", "stage")
    assert_equal "/characters/stages/0.png", json["image_path"]
    assert_equal [ 0, 300, 3_000, 25_000, 150_000, 1_000_000 ], json["stages"].map { |s| s["points"] }
    assert_equal %w[0 1 2 3 4 4].map { |n| "/characters/stages/#{n}.png" }, json["stages"].map { |s| s["image_path"] }
  end

  test "記録 → 毎日記録して進める → 日を進める → 直接決める → リセット" do
    post "/api/v1/dev/evolution/record", headers: headers, params: { item: "meal" }, as: :json
    assert_response :ok
    assert_equal [ "record", "meal", 110 ], [ json.dig("result", "action"), json.dig("result", "item"), json.dig("result", "log", "amount") ]
    assert_equal [ "meal" ], json.dig("evolution", "recorded_items_today")

    # 今日（食事は記録済みなので残り3項目）+ 5日間 4項目 = 440 + 480 + 520 + 560 + 600 + 640
    post "/api/v1/dev/evolution/simulate", headers: headers, params: { days: 6, items: 4 }, as: :json
    assert_response :ok
    assert_equal({ "points" => 110, "stage" => 0 }, json.dig("result", "before"))
    assert_equal({ "points" => 3_240, "stage" => 2 }, json.dig("result", "after"))
    assert_equal [ 6, 17, [] ], json["evolution"].values_at("streak_days", "multiplier_tenths", "recorded_items_today")

    # 今日はまだ記録していないので、3日進めると今日・明日・あさっての3日を休んだことになる
    post "/api/v1/dev/evolution/advance", headers: headers, params: { days: 3 }, as: :json
    assert_response :ok
    assert_equal [ -600, 3 ], [ json.dig("result", "log", "amount"), json.dig("result", "log", "missed_days") ]
    assert_equal [ 2_640, 0, 1 ], json["evolution"].values_at("points", "streak_days", "stage")
    assert_equal "/characters/stages/1.png", json["image_path"]

    patch "/api/v1/dev/evolution", headers: headers, params: { points: 1_000_000 }, as: :json
    assert_response :ok
    assert_equal [ 5, nil, 100.0 ], json["evolution"].values_at("stage", "next_stage_points", "progress_percent")
    assert_equal "/characters/stages/4.png", json["image_path"]

    patch "/api/v1/dev/evolution", headers: headers, params: { streak_days: 89 }, as: :json
    assert_response :ok
    assert_equal [ 89, 100 ], json["evolution"].values_at("streak_days", "multiplier_tenths")

    delete "/api/v1/dev/evolution", headers: headers
    assert_response :ok
    assert_equal [ 0, 0, 0 ], json["evolution"].values_at("points", "stage", "streak_days")
    assert_empty json["logs"]
  end

  test "入力が正しくなければ 422" do
    post "/api/v1/dev/evolution/record", headers: headers, params: { item: "bath" }, as: :json
    assert_response :unprocessable_entity
    assert_match "item は", json["errors"].first

    post "/api/v1/dev/evolution/advance", headers: headers, params: { days: 0 }, as: :json
    assert_response :unprocessable_entity

    post "/api/v1/dev/evolution/simulate", headers: headers, params: { days: 3, items: 5 }, as: :json
    assert_response :unprocessable_entity
  end
end
