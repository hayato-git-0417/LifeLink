require "test_helper"

# 進化（spec.md 4.3）: 記録 API でポイントが入り、ログイン後の API で休んだ日の分が減り、ホームに出る
class EvolutionTest < ActionDispatch::IntegrationTest
  DAY = Date.new(2026, 11, 2)

  setup do
    travel_to(at(DAY - 1, 9)) { @user = create_user } # 登録日 = DAY − 1
    @character = @user.character
  end

  def at(day, hour, min = 0)
    Time.zone.local(day.year, day.month, day.day, hour, min)
  end

  def headers
    auth_headers(@user)
  end

  def post_meal(time)
    post "/api/v1/meals", headers: headers, as: :json,
                          params: { meal: { meal_type: "lunch", eaten_at: time.iso8601, content: "カレー", calories: 700 } }
    assert_response :created
  end

  test "食事を記録するとポイントが入り、同じ日の2回目は入らない。ホームに段階・ゲージ・継続日数・倍率を返す" do
    travel_to at(DAY, 12) do
      post_meal(at(DAY, 12))
      post_meal(at(DAY, 12, 30))
      assert_equal 110, @character.reload.evolution_points

      get "/api/v1/home", headers: headers
      assert_response :ok
      assert_equal({
        "stage" => 0, "max_stage" => 5, "points" => 110,
        "current_stage_points" => 0, "next_stage_points" => 300, "points_to_next" => 190, "progress_percent" => 36.6,
        "streak_days" => 1, "multiplier_tenths" => 11, "recorded_items_today" => [ "meal" ]
      }, json["evolution"])
    end

    # 翌日はまだ記録していなくても、続けて記録したときの倍率（1.2倍）を出す
    travel_to at(DAY + 1, 8) do
      get "/api/v1/home", headers: headers
      assert_equal [ 1, 12, [] ], json["evolution"].values_at("streak_days", "multiplier_tenths", "recorded_items_today")
    end
  end

  test "睡眠は起床、ワークは終了を押したときに入る（開始では入らない）。就寝でワークを自動終了したらワーク分も入る" do
    travel_to(at(DAY, 15)) { post "/api/v1/work_records/start", headers: headers }
    assert_equal 0, @character.reload.evolution_points

    travel_to(at(DAY, 23)) do
      post "/api/v1/sleep_records/start", headers: headers # ワークをこの時刻で終える
      assert_response :created
      assert json["auto_finished_work_record"].present?
    end
    assert_equal [ "work" ], @character.evolution_point_logs.map(&:item)

    travel_to(at(DAY + 1, 7)) do
      post "/api/v1/sleep_records/finish", headers: headers
      assert_response :ok
    end
    sleep_log = @character.evolution_point_logs.item_sleep.sole
    assert_equal [ DAY + 1, 120 ], [ sleep_log.target_date, sleep_log.amount ] # 起床した日。2日目なので 1.2 倍
  end

  test "止め忘れの自動終了（16時間）ではポイントは入らない" do
    travel_to(at(DAY, 0)) { post "/api/v1/sleep_records/start", headers: headers }
    travel_to(at(DAY, 20)) do
      get "/api/v1/home", headers: headers
      assert_response :ok
    end
    assert @user.sleep_records.sole.woke_at.present?
    assert_equal 0, @character.reload.evolution_point_logs.count
  end

  test "運動は移動距離の記録でもタスクのチェックでも、その日1回分" do
    task = @user.exercise_tasks.create!(title: "1キロ走る")
    travel_to at(DAY, 18) do
      post "/api/v1/exercise_tasks/#{task.id}/completion", headers: headers
      assert_response :ok
      post "/api/v1/exercise_records", headers: headers, as: :json, params: { exercise_record: { distance_km: 2.5 } }
      assert_response :created
    end
    assert_equal [ [ "exercise", 110 ] ], @character.reload.evolution_point_logs.map { |l| [ l.item, l.amount ] }
  end

  test "記録の修正・削除ではポイントは動かない" do
    travel_to(at(DAY, 12)) { post_meal(at(DAY, 12)) }
    meal = @user.meals.sole
    travel_to at(DAY, 13) do
      patch "/api/v1/meals/#{meal.id}", headers: headers, as: :json, params: { meal: { calories: 500 } }
      assert_response :ok
      delete "/api/v1/meals/#{meal.id}", headers: headers
      assert_response :no_content
    end
    assert_equal 110, @character.reload.evolution_points
  end

  test "休んだあとに初めてアクセスした API（記録以外でも）で減り、退化したら通知画面に届く" do
    @character.update!(evolution_points: 3_200, evolution_stage: 2, streak_days: 4,
                       last_recorded_on: DAY, decay_processed_through: DAY - 1)

    travel_to at(DAY + 3, 8) do # DAY+1・DAY+2 を休んだ
      get "/api/v1/notifications", headers: headers
      assert_response :ok
      evolution = json["notifications"].find { |n| n["notification_type"] == "evolution" }
      assert_equal "めばえが退化してしまいました（進化1）", evolution["title"]

      get "/api/v1/home", headers: headers # 同じ日の2回目は減らさない
      assert_equal [ 2_800, 1, 0 ], json["evolution"].values_at("points", "stage", "streak_days")
    end
  end
end
