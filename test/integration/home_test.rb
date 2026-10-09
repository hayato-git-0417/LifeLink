require "test_helper"

# フェーズ4: ホーム API と詳細画面のグラフ API
class HomeTest < ActionDispatch::IntegrationTest
  setup do
    travel_to Time.zone.local(2026, 10, 1, 10) do
      @user = create_user
    end
    @user.create_goal!(sleep_goal_type: :time_range, bedtime: "00:00", wake_time: "07:00", work_goal_minutes: 420,
                       calorie_goal: 2200, protein_goal_g: 60, fat_goal_g: 60, carbs_goal_g: 300, fiber_goal_g: 21,
                       breakfast_time: "07:00", lunch_time: "12:00", dinner_time: "19:00")
    @user.exercise_tasks.create!(title: "1キロ走る")
    CharacterAnimation.create!(state: :hungry, gif_path: "/characters/hungry.png")
  end

  test "未ログインは 401" do
    get "/api/v1/home"
    assert_response :unauthorized
  end

  test "前日までを確定し、今日のスコア・キャラ・吹き出し・通知を返す。何度開いてもポイントは変わらない" do
    travel_to Time.zone.local(2026, 10, 4, 9) do # 10/2・10/3 は記録なし
      @user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 4, 0), woke_at: Time.zone.local(2026, 10, 4, 7))
      headers = auth_headers(@user)

      2.times do
        get "/api/v1/home", headers: headers
        assert_response :ok
        character = json["character"]
        assert_equal "hungry", character["state"] # 朝食の記録なし
        assert_equal "空腹", character["state_label"]
        assert_equal "/characters/hungry.png", character["image_path"]
        assert_equal({ "sleep" => 300, "meal" => 300, "exercise" => 300, "work" => 300, "total" => 300 }, character["points"])
        assert_equal({ "key" => "kanashii", "label" => "悲しい" }, character["mood"])

        assert_equal "2026-10-04", json.dig("today", "date")
        assert_equal 100.0, json.dig("today", "scores", "sleep")
        assert_equal 30.0, json.dig("today", "total_percent")
        assert_equal "おなかすいた…", json["message"]
        assert_equal 1, json["unread_notifications_count"] # 空腹の通知は1日1回
        assert_equal true, json["goal_registered"]
        assert_equal({ "sleep" => nil, "work" => nil }, json["timers"])
      end
      assert_equal 2, @user.daily_achievements.finalized.count
    end
  end

  test "計測中のタイマーを返し、睡眠中は sleeping。止め忘れはホームを開いたときに自動終了する" do
    travel_to Time.zone.local(2026, 10, 1, 23, 50) do
      post "/api/v1/sleep_records/start", headers: auth_headers(@user)
      get "/api/v1/home", headers: auth_headers(@user)
      assert_equal "sleeping", json.dig("character", "state")
      assert json.dig("timers", "sleep", "slept_at").present?
    end
    travel_to Time.zone.local(2026, 10, 2, 16) do
      get "/api/v1/home", headers: auth_headers(@user)
      assert_nil json.dig("timers", "sleep")
      assert_equal 100.0, json.dig("today", "scores", "sleep") # 16時間で起床扱い（集計日 10/2）
      assert_not_equal "sleeping", json.dig("character", "state")
    end
  end

  test "記録を保存したら状態を判定し直す（ワーク開始で勉強中）" do
    travel_to Time.zone.local(2026, 10, 1, 13) do
      @user.meals.create!(meal_type: :lunch, eaten_at: Time.zone.local(2026, 10, 1, 11))
      @user.meals.create!(meal_type: :breakfast, eaten_at: Time.zone.local(2026, 10, 1, 7))
      post "/api/v1/work_records/start", headers: auth_headers(@user)
      assert_equal "studying", @user.character.reload.state
      post "/api/v1/work_records/cancel", headers: auth_headers(@user)
      assert_equal "normal", @user.character.reload.state
    end
  end

  test "詳細画面のグラフ: スコアは全日、ポイントは確定した日だけ" do
    travel_to Time.zone.local(2026, 10, 3, 12) do
      @user.work_records.create!(started_at: Time.zone.local(2026, 10, 3, 8), ended_at: Time.zone.local(2026, 10, 3, 11, 30))
      get "/api/v1/home", headers: auth_headers(@user) # 10/2 を確定、10/3 を計算

      get "/api/v1/daily_achievements", params: { from: "2026-10-01", to: "2026-10-03" }, headers: auth_headers(@user)
      assert_response :ok
      rows = json["daily_achievements"]
      assert_equal %w[2026-10-02 2026-10-03], rows.map { |r| r["target_date"] } # 登録日は行なし
      assert_equal [ true, false ], rows.map { |r| r["finalized"] }
      assert_equal [ 400, nil ], rows.map { |r| r["total_points"] }
      assert_equal [ -100, nil ], rows.map { |r| r["sleep_change"] }
      assert_equal 50.0, rows.last["work_score"]
      assert_equal 400, json.dig("current_points", "total")
    end
  end
end
