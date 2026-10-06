require "test_helper"
require "minitest/mock"

# フェーズ3: 睡眠・ワークの記録 API（spec.md 2.1）
class TimedRecordsTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @headers = auth_headers(@user)
  end

  test "未ログインは 401" do
    post "/api/v1/sleep_records/start"
    assert_response :unauthorized
    get "/api/v1/work_records"
    assert_response :unauthorized
  end

  test "就寝→起床: 日付をまたいだ睡眠は起床した日に入り、時間を計算する" do
    travel_to Time.zone.local(2026, 10, 5, 23, 45) do
      post "/api/v1/sleep_records/start", headers: @headers
      assert_response :created
      assert_equal true, json.dig("sleep_record", "in_progress")
      assert_nil json["auto_finished_work_record"]

      # 計測中にもう一度押すと 422
      post "/api/v1/sleep_records/start", headers: @headers
      assert_response :unprocessable_entity
      assert_equal [ "睡眠の記録はすでに計測中です" ], json["errors"]
    end

    travel_to Time.zone.local(2026, 10, 6, 6, 15) do
      post "/api/v1/sleep_records/finish", headers: @headers
      assert_response :ok
      assert_equal 390, json.dig("sleep_record", "duration_minutes")
      assert_equal "2026-10-06", json.dig("sleep_record", "recorded_on")
      assert_equal false, json.dig("sleep_record", "in_progress")

      # 計測中でないのに起床を押すと 422
      post "/api/v1/sleep_records/finish", headers: @headers
      assert_response :unprocessable_entity
    end
  end

  test "取り消しは計測中の記録を消す。計測中でなければ 422" do
    post "/api/v1/work_records/start", params: { work_record: { title: "卒研" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal "卒研", json.dig("work_record", "title")

    assert_difference -> { @user.work_records.count }, -1 do
      post "/api/v1/work_records/cancel", headers: @headers
    end
    assert_response :no_content

    post "/api/v1/work_records/cancel", headers: @headers
    assert_response :unprocessable_entity
    assert_equal [ "計測中のワークの記録がありません" ], json["errors"]
  end

  test "就寝時にワーク計測中ならワークを自動終了し、睡眠中はワークを開始できない" do
    travel_to Time.zone.local(2026, 10, 6, 20) do
      post "/api/v1/work_records/start", headers: @headers
    end

    travel_to Time.zone.local(2026, 10, 6, 23, 30) do
      post "/api/v1/sleep_records/start", headers: @headers
      assert_response :created
      assert_equal 210, json.dig("auto_finished_work_record", "duration_minutes")
      assert_not @user.work_records.in_progress.exists?

      post "/api/v1/work_records/start", headers: @headers
      assert_response :unprocessable_entity
      assert_equal [ "睡眠中はワークを開始できません" ], json["errors"]
    end
  end

  # devise_token_auth はリクエストのたびにトークンを入れ替え、期限が「今 + 2週間」より先のトークンは消す。
  # 時刻を動かすたびに、その時刻でヘッダーを作り直す
  test "止め忘れ: 睡眠は16時間、ワークは12時間を超えたら 開始+上限 で自動終了する" do
    travel_to Time.zone.local(2026, 10, 5, 22) do
      post "/api/v1/sleep_records/start", headers: auth_headers(@user)
    end
    travel_to Time.zone.local(2026, 10, 6, 14) do # ちょうど16時間 → まだ計測中
      get "/api/v1/sleep_records", headers: auth_headers(@user)
      assert_equal true, json["sleep_records"].first["in_progress"]
    end
    travel_to Time.zone.local(2026, 10, 6, 14, 1) do
      @headers = auth_headers(@user)
      get "/api/v1/sleep_records", headers: @headers
      record = json["sleep_records"].first
      assert_equal false, record["in_progress"]
      assert_equal 960, record["duration_minutes"]
      assert_equal "2026-10-06", record["recorded_on"]

      # 自動終了したので、起床を押しても計測中の記録はない
      post "/api/v1/sleep_records/finish", headers: @headers
      assert_response :unprocessable_entity

      post "/api/v1/work_records/start", headers: @headers
    end
    travel_to Time.zone.local(2026, 10, 7, 3) do
      post "/api/v1/work_records/finish", headers: auth_headers(@user)
      assert_response :unprocessable_entity
      record = @user.work_records.last
      assert_equal 720, record.duration_minutes
      assert_equal Date.new(2026, 10, 6), record.recorded_on
    end
  end

  test "一覧は from〜to の集計日で絞り込み、新しい順。他人の記録は含まない" do
    other = create_user
    [ 3, 2, 1 ].each do |days_ago|
      woke = Time.zone.local(2026, 10, 7, 7) - days_ago.days
      @user.sleep_records.create!(slept_at: woke - 7.hours, woke_at: woke)
      other.sleep_records.create!(slept_at: woke - 6.hours, woke_at: woke)
    end

    travel_to Time.zone.local(2026, 10, 7, 12) do
      get "/api/v1/sleep_records", params: { from: "2026-10-05", to: "2026-10-06" }, headers: @headers
      assert_response :ok
      assert_equal %w[2026-10-06 2026-10-05], json["sleep_records"].map { |r| r["recorded_on"] }
      assert(json["sleep_records"].all? { |r| r["duration_minutes"] == 420 })

      # 省略時は今日までの7日
      get "/api/v1/sleep_records", headers: @headers
      assert_equal 3, json["sleep_records"].size

      get "/api/v1/sleep_records", params: { from: "2026-10-06", to: "2026-10-05" }, headers: @headers
      assert_response :unprocessable_entity
      get "/api/v1/sleep_records", params: { from: "10/5" }, headers: @headers
      assert_response :unprocessable_entity
    end
  end

  test "修正すると集計日と時間を計算し直す。計測中・未来・上限超え・他人の記録は修正できない" do
    travel_to Time.zone.local(2026, 10, 7, 12) do
      record = @user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 6, 23), woke_at: Time.zone.local(2026, 10, 7, 6))

      patch "/api/v1/sleep_records/#{record.id}",
            params: { sleep_record: { slept_at: "2026-10-05T23:30:00+09:00", woke_at: "2026-10-06T07:00:00+09:00" } },
            headers: @headers, as: :json
      assert_response :ok
      assert_equal 450, json.dig("sleep_record", "duration_minutes")
      assert_equal "2026-10-06", json.dig("sleep_record", "recorded_on")

      # 終了が開始より前
      patch "/api/v1/sleep_records/#{record.id}",
            params: { sleep_record: { slept_at: "2026-10-06T07:00:00+09:00", woke_at: "2026-10-06T06:00:00+09:00" } },
            headers: @headers, as: :json
      assert_response :unprocessable_entity

      # 上限（16時間）超え
      patch "/api/v1/sleep_records/#{record.id}",
            params: { sleep_record: { slept_at: "2026-10-05T12:00:00+09:00", woke_at: "2026-10-06T07:00:00+09:00" } },
            headers: @headers, as: :json
      assert_response :unprocessable_entity

      # 未来の終了日時
      patch "/api/v1/sleep_records/#{record.id}",
            params: { sleep_record: { slept_at: "2026-10-07T06:00:00+09:00", woke_at: "2026-10-07T13:00:00+09:00" } },
            headers: @headers, as: :json
      assert_response :unprocessable_entity
      assert_equal [ "終了日時は現在より前にしてください" ], json["errors"]

      # 日時の形式が正しくない・項目がない
      patch "/api/v1/sleep_records/#{record.id}", params: { sleep_record: { slept_at: "きのう", woke_at: "2026-10-06T07:00:00+09:00" } },
                                                  headers: @headers, as: :json
      assert_response :unprocessable_entity
      patch "/api/v1/sleep_records/#{record.id}", params: { sleep_record: { slept_at: "2026-10-05T23:30:00+09:00" } },
                                                  headers: @headers, as: :json
      assert_response :unprocessable_entity

      # 計測中
      in_progress = @user.work_records.create!(started_at: 1.hour.ago)
      patch "/api/v1/work_records/#{in_progress.id}",
            params: { work_record: { started_at: 2.hours.ago.iso8601, ended_at: 1.hour.ago.iso8601 } },
            headers: @headers, as: :json
      assert_response :unprocessable_entity

      # 他人の記録は 404
      others = create_user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 6, 23), woke_at: Time.zone.local(2026, 10, 7, 6))
      patch "/api/v1/sleep_records/#{others.id}",
            params: { sleep_record: { slept_at: "2026-10-06T22:00:00+09:00", woke_at: "2026-10-07T06:00:00+09:00" } },
            headers: @headers, as: :json
      assert_response :not_found
      delete "/api/v1/sleep_records/#{others.id}", headers: @headers
      assert_response :not_found
      assert SleepRecord.exists?(others.id)
    end
  end

  test "ワークの修正で開始日を変えると集計日も変わる。内容も直せる" do
    travel_to Time.zone.local(2026, 10, 7, 12) do
      record = @user.work_records.create!(started_at: Time.zone.local(2026, 10, 7, 9), ended_at: Time.zone.local(2026, 10, 7, 11))
      patch "/api/v1/work_records/#{record.id}",
            params: { work_record: { started_at: "2026-10-06T23:00:00+09:00", ended_at: "2026-10-07T01:00:00+09:00", title: "レポート" } },
            headers: @headers, as: :json
      assert_response :ok
      assert_equal "2026-10-06", json.dig("work_record", "recorded_on")
      assert_equal 120, json.dig("work_record", "duration_minutes")
      assert_equal "レポート", json.dig("work_record", "title")
    end
  end

  test "削除" do
    record = @user.work_records.create!(started_at: 3.hours.ago, ended_at: 1.hour.ago)
    delete "/api/v1/work_records/#{record.id}", headers: @headers
    assert_response :no_content
    assert_not WorkRecord.exists?(record.id)
  end

  test "記録が変わった日の達成度の再計算を呼ぶ（修正で日付が変わったら前後の日）" do
    calls = []
    record = @user.sleep_records.create!(slept_at: Time.zone.local(2026, 10, 5, 23), woke_at: Time.zone.local(2026, 10, 6, 6))
    DailyAchievementUpdater.stub(:call, ->(user:, dates:) { calls << dates }) do
      travel_to Time.zone.local(2026, 10, 7, 12) do
        patch "/api/v1/sleep_records/#{record.id}",
              params: { sleep_record: { slept_at: "2026-10-06T23:00:00+09:00", woke_at: "2026-10-07T06:00:00+09:00" } },
              headers: @headers, as: :json
      end
    end
    assert_response :ok
    assert_includes calls, [ Date.new(2026, 10, 6), Date.new(2026, 10, 7) ]
  end
end
