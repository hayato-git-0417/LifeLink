require "test_helper"

# フェーズ2: 新規登録 → ログイン → 目標保存 → 自分の情報、未ログインは 401
class AuthAndGoalTest < ActionDispatch::IntegrationTest
  SIGN_UP = {
    email: "taro@example.com", password: "password", password_confirmation: "password",
    name: "たろう", icon: "cat", birthdate: "2006-10-13", gender: "male"
  }.freeze

  GOAL = {
    goal: {
      sleep_goal_type: "time_range", bedtime: "00:00", wake_time: "07:00", work_goal_minutes: 420,
      calorie_goal: 2600, protein_goal_g: 65, fat_goal_g: 72.2, carbs_goal_g: 373.8, fiber_goal_g: 20,
      breakfast_time: "07:00", lunch_time: "12:00", dinner_time: "19:00"
    },
    exercise_tasks: [ { title: "1キロ走る" }, { title: "腕立て伏せ100回" } ]
  }.freeze

  setup do
    NutritionStandard.create!(gender: :male, age_from: 18, age_to: 29, activity_level: :moderate,
                              calories: 2600, protein_g: 65, fat_g: 72.2, carbs_g: 373.8, fiber_g: 20)
    NutritionStandard.create!(gender: :female, age_from: 18, age_to: 29, activity_level: :moderate,
                              calories: 1950, protein_g: 50, fat_g: 54.2, carbs_g: 280.3, fiber_g: 18)
  end

  def auth_headers_from(response)
    response.headers.slice("access-token", "client", "uid")
  end

  def json
    response.parsed_body
  end

  test "新規登録→ログイン→目標保存→自分の情報を取得" do
    travel_to Time.zone.local(2026, 10, 6, 21, 0) do
      # ① メールの重複確認
      get "/api/v1/registrations/email_available", params: { email: "Taro@Example.com" }
      assert_response :ok
      assert_equal true, json["available"]

      # ①〜② をまとめて新規登録（キャラも作られる）
      post "/api/v1/auth", params: SIGN_UP, as: :json
      assert_response :ok
      user = User.find_by!(email: "taro@example.com")
      assert_equal "たろう", user.name
      assert user.cat?
      assert user.male?
      assert_equal Date.new(2026, 10, 6), user.character.last_reset_on
      assert_equal 500, user.character.total_points

      get "/api/v1/registrations/email_available", params: { email: "taro@example.com" }
      assert_equal false, json["available"]

      # ログイン
      post "/api/v1/auth/sign_in", params: { email: "taro@example.com", password: "password" }, as: :json
      assert_response :ok
      headers = auth_headers_from(response)
      assert headers["access-token"].present?

      # 目標がまだない → goal_registered: false（フロントは目標設定へ誘導）
      get "/api/v1/me", headers: headers
      assert_response :ok
      assert_equal false, json.dig("user", "goal_registered")
      assert_equal 19, json.dig("user", "age")

      # ④ の初期値（ログイン中なら自分の生年月日・性別から）
      get "/api/v1/goal/nutrition_defaults", headers: headers
      assert_response :ok
      assert_equal 2600, json.dig("nutrition_defaults", "calorie_goal")

      # 目標を保存
      put "/api/v1/goal", params: GOAL, headers: headers, as: :json
      assert_response :ok
      assert_equal "00:00", json.dig("goal", "bedtime")
      assert_equal 420, json.dig("goal", "target_sleep_minutes")
      assert_equal [ "1キロ走る", "腕立て伏せ100回" ], json["exercise_tasks"].map { _1["title"] }

      get "/api/v1/goal", headers: headers
      assert_equal 2600, json.dig("goal", "calorie_goal")
      assert_equal 72.2, json.dig("goal", "fat_goal_g") # 文字列ではなく数値

      get "/api/v1/me", headers: headers
      assert_equal true, json.dig("user", "goal_registered")
    end
  end

  test "新規登録のエラーは { errors: [...] } で 422" do
    post "/api/v1/auth", params: SIGN_UP.merge(name: "", birthdate: nil), as: :json
    assert_response :unprocessable_entity
    assert_kind_of Array, json["errors"]
    assert_includes json["errors"], "ユーザー名を入力してください"
    assert_equal 0, User.count
    assert_equal 0, Character.count
  end

  test "同じメールアドレスでは登録できない" do
    create_user(email: "taro@example.com")
    post "/api/v1/auth", params: SIGN_UP, as: :json
    assert_response :unprocessable_entity
  end

  test "ログイン失敗は 401" do
    create_user(email: "taro@example.com")
    post "/api/v1/auth/sign_in", params: { email: "taro@example.com", password: "wrong" }, as: :json
    assert_response :unauthorized
    assert_kind_of Array, json["errors"]
  end

  test "未ログインでは自分の情報・目標は 401" do
    get "/api/v1/me"
    assert_response :unauthorized
    assert_equal [ "ログインしてください" ], json["errors"]

    get "/api/v1/goal"
    assert_response :unauthorized

    put "/api/v1/goal", params: GOAL, as: :json
    assert_response :unauthorized
  end

  test "栄養の初期値はログインなしでも生年月日・性別を渡せば取れる（新規登録④）" do
    travel_to Time.zone.local(2026, 10, 6) do
      get "/api/v1/goal/nutrition_defaults", params: { birthdate: "2006-10-13", gender: "unspecified" }
      assert_response :ok
      assert_equal 2275, json.dig("nutrition_defaults", "calorie_goal")

      get "/api/v1/goal/nutrition_defaults", params: { birthdate: "2006-13-45" }
      assert_response :unprocessable_entity

      get "/api/v1/goal/nutrition_defaults"
      assert_response :unprocessable_entity
    end
  end

  test "プロフィール変更と、目標保存のエラー" do
    user = create_user(email: "taro@example.com")
    post "/api/v1/auth/sign_in", params: { email: "taro@example.com", password: "password" }, as: :json
    headers = auth_headers_from(response)

    patch "/api/v1/me", params: { user: { name: "じろう", icon: "penguin" } }, headers: headers, as: :json
    assert_response :ok
    assert_equal "じろう", user.reload.name

    patch "/api/v1/me", params: { user: { name: "" } }, headers: headers, as: :json
    assert_response :unprocessable_entity

    put "/api/v1/goal", params: GOAL.merge(exercise_tasks: []), headers: headers, as: :json
    assert_response :unprocessable_entity
    assert_includes json["errors"], "運動タスクを1件以上登録してください"
  end

  test "メール確認はメールアドレスが必要" do
    get "/api/v1/registrations/email_available"
    assert_response :unprocessable_entity
    get "/api/v1/registrations/email_available", params: { email: "not-an-email" }
    assert_response :unprocessable_entity
  end
end
