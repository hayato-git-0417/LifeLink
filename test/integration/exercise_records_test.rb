require "test_helper"

# フェーズ3: 運動の記録（移動距離の手入力）と運動タスクのチェック
class ExerciseRecordsTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @headers = auth_headers(@user)
  end

  test "未ログインは 401" do
    get "/api/v1/exercise_records"
    assert_response :unauthorized
    get "/api/v1/exercise_tasks/today"
    assert_response :unauthorized
  end

  test "移動距離を入力すると今日に入り、一覧に日ごとの合計が出る" do
    travel_to Time.zone.local(2026, 10, 6, 18) do
      post "/api/v1/exercise_records", params: { exercise_record: { distance_km: 2.5, memo: "ジョギング" } }, headers: @headers, as: :json
      assert_response :created
      assert_equal 2.5, json.dig("exercise_record", "distance_km")
      assert_equal "2026-10-06", json.dig("exercise_record", "recorded_on")

      post "/api/v1/exercise_records", params: { exercise_record: { distance_km: 1.25 } }, headers: @headers, as: :json
      @user.exercise_records.create!(started_at: 2.days.ago, distance_km: 3)
      create_user.exercise_records.create!(started_at: Time.current, distance_km: 9)

      get "/api/v1/exercise_records", headers: @headers
      assert_response :ok
      assert_equal 3, json["exercise_records"].size
      totals = json["daily_totals"]
      assert_equal 7, totals.size
      assert_equal({ "date" => "2026-09-30", "distance_km" => 0.0 }, totals.first)
      assert_equal({ "date" => "2026-10-04", "distance_km" => 3.0 }, totals[4])
      assert_equal({ "date" => "2026-10-06", "distance_km" => 3.75 }, totals.last)
    end
  end

  test "距離がない・0以下は 422" do
    post "/api/v1/exercise_records", params: { exercise_record: { memo: "散歩" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/exercise_records", params: { exercise_record: { distance_km: 0 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "削除できるのは自分の記録だけ" do
    mine = @user.exercise_records.create!(started_at: Time.current, distance_km: 1)
    others = create_user.exercise_records.create!(started_at: Time.current, distance_km: 1)

    delete "/api/v1/exercise_records/#{others.id}", headers: @headers
    assert_response :not_found
    delete "/api/v1/exercise_records/#{mine.id}", headers: @headers
    assert_response :no_content
    assert_not ExerciseRecord.exists?(mine.id)
    assert ExerciseRecord.exists?(others.id)
  end

  test "今日のタスクのチェックを付け外しできる。何度押しても1日1件" do
    run = @user.exercise_tasks.create!(title: "1キロ走る", position: 0)
    push_up = @user.exercise_tasks.create!(title: "腕立て伏せ100回", position: 1)
    @user.exercise_tasks.create!(title: "削除済み", position: 2, active: false)

    travel_to Time.zone.local(2026, 10, 6, 18) do
      get "/api/v1/exercise_tasks/today", headers: @headers
      assert_response :ok
      assert_equal "2026-10-06", json["date"]
      assert_equal %w[1キロ走る 腕立て伏せ100回], json["exercise_tasks"].map { |t| t["title"] }
      assert_equal [ 0, 2 ], [ json["completed_count"], json["total_count"] ]

      2.times do
        post "/api/v1/exercise_tasks/#{run.id}/completion", headers: @headers
        assert_response :ok
        assert_equal true, json.dig("exercise_task", "completed")
      end
      assert_equal 1, run.exercise_task_completions.count

      get "/api/v1/exercise_tasks/today", headers: @headers
      assert_equal [ true, false ], json["exercise_tasks"].map { |t| t["completed"] }
      assert_equal 1, json["completed_count"]

      delete "/api/v1/exercise_tasks/#{run.id}/completion", headers: @headers
      assert_response :ok
      assert_equal false, json.dig("exercise_task", "completed")
      assert_equal 0, run.exercise_task_completions.count

      # 外したあとにもう一度外しても同じ結果
      delete "/api/v1/exercise_tasks/#{run.id}/completion", headers: @headers
      assert_response :ok
      post "/api/v1/exercise_tasks/#{push_up.id}/completion", headers: @headers
    end

    # 日付が変わると未チェックに戻る（前日の達成は残る）
    travel_to Time.zone.local(2026, 10, 7, 0, 5) do
      get "/api/v1/exercise_tasks/today", headers: @headers
      assert_equal 0, json["completed_count"]
      assert push_up.completed_on?(Date.new(2026, 10, 6))
    end
  end

  test "削除済み・他人のタスクはチェックできない（404）" do
    inactive = @user.exercise_tasks.create!(title: "削除済み", active: false)
    others = create_user.exercise_tasks.create!(title: "他人のタスク")

    post "/api/v1/exercise_tasks/#{inactive.id}/completion", headers: @headers
    assert_response :not_found
    post "/api/v1/exercise_tasks/#{others.id}/completion", headers: @headers
    assert_response :not_found
    assert_equal 0, ExerciseTaskCompletion.count
  end
end
