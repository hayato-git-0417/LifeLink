require "test_helper"

# 相互フォローの人の記録の詳細（読み取り専用。チームの要望 2026-10-07）
class UserRecordsTest < ActionDispatch::IntegrationTest
  setup do
    @me = create_user(name: "自分")
    @friend = create_user(name: "ともだち")
    @me.active_follows.create!(followed: @friend)
    @friend.active_follows.create!(followed: @me)
  end

  def records_path(user, **params)
    "/api/v1/users/#{user.id}/records?#{params.to_query}"
  end

  test "未ログインは 401" do
    get records_path(@friend)
    assert_response :unauthorized
  end

  test "相互フォローなら mutual が true。片方だけなら false" do
    get "/api/v1/users/#{@friend.id}", headers: auth_headers(@me)
    assert_equal true, json["user"]["mutual"]

    one_way = create_user(name: "かたおもい")
    @me.active_follows.create!(followed: one_way)
    get "/api/v1/users/#{one_way.id}", headers: auth_headers(@me)
    assert_equal false, json["user"]["mutual"]

    get "/api/v1/users/#{@me.id}", headers: auth_headers(@me)
    assert_equal false, json["user"]["mutual"]
  end

  test "片方だけのフォロー・自分・存在しない人は 404" do
    following_only = create_user
    @me.active_follows.create!(followed: following_only)
    followed_only = create_user
    followed_only.active_follows.create!(followed: @me)

    [ following_only, followed_only, @me ].each do |user|
      get records_path(user), headers: auth_headers(@me)
      assert_response :not_found
      assert_equal [ "データが見つかりません" ], json["errors"]
    end

    get "/api/v1/users/0/records", headers: auth_headers(@me)
    assert_response :not_found
  end

  test "睡眠・ワークは自分の詳細と同じ形。グラフの行といまのポイントも返す" do
    travel_to Time.zone.local(2026, 10, 7, 12) do
      @friend.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 5, 23), woke_at: Time.zone.local(2026, 10, 6, 7))
      @friend.work_records.create!(title: "卒研", started_at: Time.zone.local(2026, 10, 6, 9), ended_at: Time.zone.local(2026, 10, 6, 11))
      @friend.daily_achievements.create!(target_date: Date.new(2026, 10, 6), sleep_score: 80)
      @friend.character.update!(sleep_points: 120, total_points: 480)

      get records_path(@friend, tab: "sleep", from: "2026-10-01", to: "2026-10-07"), headers: auth_headers(@me)
      assert_response :ok
      assert_equal %w[current_points daily_achievements sleep_records], json.keys.sort
      record = json["sleep_records"].sole
      assert_equal "2026-10-06", record["recorded_on"]
      assert_equal 480, record["duration_minutes"]
      assert_equal false, record["in_progress"]
      assert_equal [ "2026-10-06" ], json["daily_achievements"].map { |row| row["target_date"] }
      assert_equal 80.0, json["daily_achievements"].first["sleep_score"]
      assert_equal 120, json["current_points"]["sleep"]
      assert_equal 480, json["current_points"]["total"]

      get records_path(@friend, tab: "work", from: "2026-10-01", to: "2026-10-07"), headers: auth_headers(@me)
      assert_equal "卒研", json["work_records"].sole["title"]
    end
  end

  test "食事は集計日と栄養値だけ（内容・コメント・写真は返さない）。運動は日ごとの移動距離だけ" do
    travel_to Time.zone.local(2026, 10, 7, 12) do
      @friend.meals.create!(meal_type: :lunch, eaten_at: Time.zone.local(2026, 10, 6, 12), content: "カレー",
                            comment: "ひみつ", calories: 700, protein_g: 20.5)
      @friend.exercise_records.create!(started_at: Time.zone.local(2026, 10, 6, 18), distance_km: 2.5, memo: "ジョギング")
      @friend.exercise_records.create!(started_at: Time.zone.local(2026, 10, 6, 20), distance_km: 1)

      get records_path(@friend, tab: "meal", from: "2026-10-05", to: "2026-10-07"), headers: auth_headers(@me)
      assert_response :ok
      meal = json["meals"].sole
      assert_equal %w[recorded_on calories protein_g fat_g carbs_g fiber_g].sort, meal.keys.sort
      assert_equal 700, meal["calories"]
      assert_equal 20.5, meal["protein_g"]

      get records_path(@friend, tab: "exercise", from: "2026-10-05", to: "2026-10-07"), headers: auth_headers(@me)
      assert_equal %w[current_points daily_achievements daily_totals], json.keys.sort
      assert_equal [ 0.0, 3.5, 0.0 ], json["daily_totals"].map { |day| day["distance_km"] }
    end
  end

  test "見ても相手の止め忘れの自動終了・日次確定はしない" do
    travel_to Time.zone.local(2026, 10, 1, 22) do
      @friend.sleep_records.create!(slept_at: Time.current)
    end
    travel_to Time.zone.local(2026, 10, 7, 12) do
      get records_path(@friend, tab: "sleep", from: "2026-10-01", to: "2026-10-07"), headers: auth_headers(@me)
      assert_response :ok
      assert_equal true, json["sleep_records"].sole["in_progress"]
      assert_equal 0, @friend.daily_achievements.count
    end
  end

  test "tab が正しくないと 422" do
    get records_path(@friend, tab: "secret"), headers: auth_headers(@me)
    assert_response :unprocessable_entity
    assert_equal [ "tab は sleep / meal / exercise / work のどれかにしてください" ], json["errors"]
  end
end
