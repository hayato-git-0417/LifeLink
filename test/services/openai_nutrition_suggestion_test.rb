require "test_helper"
require "minitest/mock"
require "net/http"

class OpenaiNutritionSuggestionTest < ActiveSupport::TestCase
  test "必要最小限のプロフィールで構造化出力を依頼する" do
    response = Net::HTTPOK.new("1.1", "200", "OK")
    response.body = JSON.generate(status: "completed", output: [{ content: [{ type: "output_text", text: JSON.generate(calorie_goal: 2500, protein_percent: 17, fat_percent: 25, reason: "活動量を考慮した目安です") }] }])
    response.instance_variable_set(:@read, true)
    client = Minitest::Mock.new
    client.expect(:request, response) do |request|
      payload = JSON.parse(request.body)
      assert_equal false, payload["store"]
      assert payload.dig("text", "format", "strict")
      prompt = payload.dig("input", 0, "content", 0, "text")
      assert_includes prompt, "2500 kcal"
      assert_includes prompt, "moderate"
      assert_not_includes prompt, "birthdate"
      assert_not_includes prompt, "email"
      true
    end
    connection = ->(*_args, **_options, &block) { block.call(client) }
    ENV.stub(:[], ->(key) { key == "OPENAI_API_KEY" ? "test-key" : nil }) do
      Net::HTTP.stub(:start, connection) do
        result = OpenaiNutritionSuggestion.call(profile: { age: 30, gender: "male", height_cm: 170, weight_kg: 65, activity_level: "moderate" }, baseline: { calorie_goal: 2500 })
        assert_equal 2500, result["calorie_goal"]
      end
    end
    client.verify
  end

  test "APIキー未設定は利用不能として扱う" do
    ENV.stub(:[], ->(_key) { nil }) do
      assert_raises(OpenaiNutritionSuggestion::Unavailable) { OpenaiNutritionSuggestion.call(profile: {}, baseline: {}) }
    end
  end
end
