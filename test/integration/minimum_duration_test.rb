require "test_helper"

class MinimumDurationTest < ActionDispatch::IntegrationTest
  setup do
    @user = create_user
    @headers = auth_headers(@user)
  end

  test "sleep, work, and timer exercise reject durations shorter than one minute" do
    now = Time.zone.local(2026, 10, 6, 12)

    travel_to now do
      post "/api/v1/sleep_records/start", headers: @headers
      travel 59.seconds do
        post "/api/v1/sleep_records/finish", headers: @headers
      end
      assert_response :ok
      assert_equal true, json["discarded"]
      assert_equal 0, @user.sleep_records.reload.count

      post "/api/v1/work_records/start", headers: @headers
      travel 59.seconds do
        post "/api/v1/work_records/finish", headers: @headers
      end
      assert_response :ok
      assert_equal true, json["discarded"]
      assert_equal 0, @user.work_records.reload.count

      post "/api/v1/exercise_records", params: {
        exercise_record: { record_method: "timer", duration_minutes: 0, memo: "運動" }
      }, headers: @headers, as: :json
      assert_response :unprocessable_entity
    end
  end
end
