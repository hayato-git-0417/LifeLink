require "test_helper"
require "minitest/mock"
require "net/http"

class OpenaiMealScannerTest < ActiveSupport::TestCase
  test "解析スキーマと返却する栄養値から食物繊維を除外する" do
    response = Net::HTTPOK.new("1.1", "200", "OK")
    response.body = JSON.generate(
      status: "completed",
      output: [ { content: [ {
        type: "output_text",
        text: JSON.generate(
          category: "real_common_food", authenticity: "likely_real_food",
          confidence: 98, imitation_signs: [], content: "ご飯（白米）",
          calories: 250, protein_g: 4, fat_g: 0.5, carbs_g: 55
        )
      } ] } ]
    )
    response.instance_variable_set(:@read, true)
    client = Minitest::Mock.new
    client.expect(:request, response) do |request|
      payload = JSON.parse(request.body)
      schema = payload.dig("text", "format", "schema")
      assert_not schema.fetch("properties").key?("fiber_g")
      assert_not schema.fetch("properties").key?("calories")
      assert schema.fetch("properties").key?("components")
      assert_not_includes schema.fetch("required"), "fiber_g"
      prompt = payload.dig("input", 0, "content", 0, "text")
      assert_includes prompt, "ユーザーが修正した食事内容"
      assert_includes prompt, "パフェ2つ"
      assert_includes prompt, "写真に写る個数すべての合計値"
      true
    end
    connection = ->(*_args, **_options, &block) { block.call(client) }

    ENV.stub(:[], ->(key) { key == "OPENAI_API_KEY" ? "test-key" : nil }) do
      Net::HTTP.stub(:start, connection) do
        photo = StringIO.new("\xFF\xD8\xFF".b)
        result = OpenaiMealScanner.call(photo: photo, content_hint: "パフェ2つ")
        assert_equal 250, result[:calories]
        assert_equal 55, result[:carbs_g]
        assert_not result.key?(:fiber_g)
      end
    end
    client.verify
  end
  test "店舗名を入力しても店舗別の特例で栄養値を書き換えない" do
    result = scan_fake(content_hint: "テスト店舗 唐揚げ定食 並盛")
    assert_nil result[:calories]
    assert result[:nutrition_warning]
    assert_not result.key?(:nutrition_source)
  end

  test "写真のPFCとカロリーの大きな矛盾をそのまま画面へ返さない" do
    result = scan_fake
    assert_nil result[:calories]
    assert_nil result[:fat_g]
    assert result[:nutrition_warning]
    assert_nil result[:nutrition_source]
  end

  test "評価時は補正前の推定栄養値も比較用に返す" do
    result = scan_fake(evaluation: true)
    assert_equal 500, result.dig(:raw_nutrients, :calories)
    assert_nil result[:calories]
    assert_equal "real_common_food", result[:category]
  end

  test "料理名を指定しても食べ物でない写真は拒否する" do
    assert_raises OpenaiMealScanner::UnsupportedImageError do
      scan_fake(content_hint: "テスト店舗 唐揚げ定食 並盛", category: "non_food")
    end
  end

  test "新しい画像応答では合計値を信用せず品目の重量から栄養を計算する" do
    rice = FoodComposition.create!(food_code: "01088", name: "炊いた白米", calories: 156, protein_g: 2.5, fat_g: 0.3, carbs_g: 37.1)
    result = scan_fake(components: [{ name: "ご飯", estimated_weight_g: 200, food_code: rice.food_code,
                                    nutrients_per_100g: { calories: 999, protein_g: 100, fat_g: 100, carbs_g: 100 } }])
    assert_equal 312, result[:calories]
    assert_equal 5, result[:protein_g]
    assert_equal "food_composition", result[:portion_estimates].first[:source]
    assert_not result.key?(:raw_components)
  end

  test "評価用のモデルを切り替えて使用モデルを結果に記録する" do
    result = scan_fake(evaluation: true, model: "comparison-model")
    assert_equal "comparison-model", result[:model_used]
    assert_equal 3, result[:input_image_bytes]
  end

  test "食品コードはそのリクエストの候補に限定し共通スキーマは書き換えない" do
    reference = FoodComposition.new(food_code: "01088", name: "白米")
    schema = OpenaiMealScanner.request_schema([reference])
    assert_equal ["01088", nil], schema.dig(:properties, :components, :items, :properties, :food_code, :enum)
    assert_not OpenaiMealScanner::SCHEMA.dig(:properties, :components, :items, :properties, :food_code).key?(:enum)
  end

  private

  def scan_fake(content_hint: nil, evaluation: false, category: "real_common_food", components: nil, model: nil)
    result = {
      category: category, authenticity: "likely_real_food", confidence: 98,
      imitation_signs: [], content: "唐揚げ定食（白米、唐揚げ）",
      calories: 500, protein_g: 100, fat_g: 100, carbs_g: 150
    }
    result[:components] = components unless components.nil?
    response = Net::HTTPOK.new("1.1", "200", "OK")
    response.body = JSON.generate(status: "completed", output: [{ content: [{ type: "output_text", text: JSON.generate(result) }] }])
    response.instance_variable_set(:@read, true)
    client = Minitest::Mock.new
    client.expect(:request, response) { |request| assert_equal(model || OpenaiMealScanner::MODEL, JSON.parse(request.body)["model"]); true }
    connection = ->(*_args, **_options, &block) { block.call(client) }
    ENV.stub(:[], ->(key) { key == "OPENAI_API_KEY" ? "test-key" : nil }) do
      Net::HTTP.stub(:start, connection) do
        OpenaiMealScanner.call(photo: StringIO.new("\xFF\xD8\xFF".b), content_hint: content_hint, evaluation: evaluation, model: model)
      end
    end
  ensure
    client&.verify
  end
end
