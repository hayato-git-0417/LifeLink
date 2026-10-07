require "test_helper"

# フェーズ3: 食事の記録（手入力・写真つき）
class MealsTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @headers = auth_headers(@user)
  end

  def photo(name = "meal.png", type = "image/png")
    fixture_file_upload(name, type)
  end

  test "未ログインは 401" do
    get "/api/v1/meals"
    assert_response :unauthorized
  end

  test "写真つきで記録（multipart）し、写真の URL を返す。一覧は日付で絞り込む" do
    travel_to Time.zone.local(2026, 10, 6, 12, 30) do
      post "/api/v1/meals", headers: @headers, params: {
        meal: {
          meal_type: "lunch", eaten_at: "2026-10-06T12:15:00+09:00", content: "カレーライス",
          calories: 750, protein_g: 20.5, fat_g: 25, carbs_g: 110.2, fiber_g: 4.5, comment: "大盛り",
          photo: photo
        }
      }
      assert_response :created
      meal = json["meal"]
      assert_equal "lunch", meal["meal_type"]
      assert_equal "manual", meal["input_method"]
      assert_equal "2026-10-06", meal["recorded_on"]
      assert_equal 20.5, meal["protein_g"]
      assert_equal 750, meal["calories"]
      assert_match %r{\A/rails/active_storage/blobs/.+/meal\.png\z}, meal["photo_url"]

      # 写真の URL で画像を取得できる（Active Storage がリダイレクトする）
      get meal["photo_url"]
      assert_response :redirect

      # 写真なし・栄養値なしでも記録できる（JSON）
      post "/api/v1/meals", params: { meal: { meal_type: "snack", eaten_at: "2026-10-06T15:00:00+09:00" } }, headers: @headers, as: :json
      assert_response :created
      assert_nil json.dig("meal", "photo_url")
      @user.meals.create!(meal_type: :dinner, eaten_at: Time.zone.local(2026, 10, 5, 19))
      create_user.meals.create!(meal_type: :lunch, eaten_at: Time.current)

      get "/api/v1/meals", headers: @headers
      assert_response :ok
      assert_equal "2026-10-06", json["date"]
      assert_equal %w[lunch snack], json["meals"].map { |m| m["meal_type"] }

      get "/api/v1/meals", params: { date: "2026-10-05" }, headers: @headers
      assert_equal %w[dinner], json["meals"].map { |m| m["meal_type"] }
    end
  end

  test "from・to で期間の一覧（詳細画面の食事タブ）" do
    travel_to Time.zone.local(2026, 10, 7, 20) do
      @user.meals.create!(meal_type: :dinner, eaten_at: Time.zone.local(2026, 9, 30, 19))
      @user.meals.create!(meal_type: :breakfast, eaten_at: Time.zone.local(2026, 10, 1, 7), calories: 400)
      @user.meals.create!(meal_type: :lunch, eaten_at: Time.zone.local(2026, 10, 7, 12), calories: 600)
      headers = auth_headers(@user)

      get "/api/v1/meals", params: { from: "2026-10-01", to: "2026-10-07" }, headers: headers
      assert_response :ok
      assert_equal "2026-10-01", json["from"]
      assert_equal [ 400, 600 ], json["meals"].map { |m| m["calories"] }

      get "/api/v1/meals", params: { from: "2026-10-07", to: "2026-10-01" }, headers: headers
      assert_response :unprocessable_entity
    end
  end

  test "入力が正しくなければ 422（区分・時間・マイナス・画像以外）" do
    post "/api/v1/meals", params: { meal: { meal_type: "brunch", eaten_at: Time.current.iso8601 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/meals", params: { meal: { meal_type: "lunch" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/meals", params: { meal: { meal_type: "lunch", eaten_at: Time.current.iso8601, calories: -1 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    post "/api/v1/meals", headers: @headers,
                          params: { meal: { meal_type: "lunch", eaten_at: Time.current.iso8601, photo: photo("not_image.txt", "text/plain") } }
    assert_response :unprocessable_entity
    assert_includes json["errors"], "写真は画像ファイル（JPEG・PNG など）にしてください"
    assert_equal 0, @user.meals.count
  end

  test "詳細・修正・写真を外す・削除" do
    meal = @user.meals.create!(meal_type: :breakfast, eaten_at: Time.zone.local(2026, 10, 6, 7), calories: 400)
    meal.photo.attach(io: File.open(file_fixture("meal.png")), filename: "meal.png", content_type: "image/png")

    get "/api/v1/meals/#{meal.id}", headers: @headers
    assert_response :ok
    assert json.dig("meal", "photo_url").present?

    patch "/api/v1/meals/#{meal.id}", params: { meal: { calories: 450, eaten_at: "2026-10-05T23:30:00+09:00" } }, headers: @headers, as: :json
    assert_response :ok
    assert_equal 450, json.dig("meal", "calories")
    assert_equal "2026-10-05", json.dig("meal", "recorded_on")
    assert json.dig("meal", "photo_url").present?, "写真を送らなければそのまま"

    patch "/api/v1/meals/#{meal.id}", params: { meal: { remove_photo: true } }, headers: @headers, as: :json
    assert_response :ok
    assert_nil json.dig("meal", "photo_url")
    assert_not meal.reload.photo.attached?

    delete "/api/v1/meals/#{meal.id}", headers: @headers
    assert_response :no_content
    assert_not Meal.exists?(meal.id)
  end

  test "他人の食事は見られない・直せない・消せない（404）" do
    others = create_user.meals.create!(meal_type: :lunch, eaten_at: Time.current)

    get "/api/v1/meals/#{others.id}", headers: @headers
    assert_response :not_found
    patch "/api/v1/meals/#{others.id}", params: { meal: { calories: 1 } }, headers: @headers, as: :json
    assert_response :not_found
    delete "/api/v1/meals/#{others.id}", headers: @headers
    assert_response :not_found
    assert Meal.exists?(others.id)
  end
end
