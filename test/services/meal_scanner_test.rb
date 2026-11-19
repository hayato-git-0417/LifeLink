require "test_helper"
require "minitest/mock"

class MealScannerTest < ActiveSupport::TestCase
  test "確信度の高い領域候補を統合し、日本語の料理名を自動で返す" do
    result = scan(
      [
        {
          "recognition_results" => [
            { "name" => "grilled salmon", "prob" => 0.62 },
            { "name" => "grilled fish", "prob" => 0.18 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "grilled salmon", "prob" => 0.55 },
            { "name" => "trout", "prob" => 0.31 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "invalid", "prob" => 1.2 },
            { "name" => "", "prob" => 0.99 }
          ]
        }
      ],
      translations: {
        "grilled fish" => "焼き魚",
        "trout" => "マス"
      }
    )

    assert_equal "焼き鮭", result[:content]
    assert_equal 501, result[:calories]
    assert_equal 21.3, result[:protein_g]
    assert_equal 18.6, result[:fat_g]
    assert_equal 62.3, result[:carbs_g]
    assert_not result.key?(:fiber_g)
  end

  test "確信度が閾値未満の品目を除外しつつ複数の料理を返す" do
    result = scan(
      [
        {
          "recognition_results" => [
            { "name" => "grilled salmon", "prob" => 0.56 },
            { "name" => "grilled fish", "prob" => 0.18 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "grilled salmon", "prob" => 0.32 },
            { "name" => "salmon", "prob" => 0.2 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "bean sprouts", "prob" => 0.49 },
            { "name" => "endives", "prob" => 0.255 }
          ]
        }
      ],
      translations: { "bean sprouts" => "もやし" }
    )

    assert_equal "焼き鮭、もやし", result[:content]
  end

  test "確信度が高くても次点と僅差なら料理名に含めない" do
    result = scan(
      [
        {
          "recognition_results" => [
            { "name" => "spring rolls", "prob" => 0.45 },
            { "name" => "gyoza", "prob" => 0.4 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "kiwi", "prob" => 0.39 },
            { "name" => "mango", "prob" => 0.1 }
          ]
        }
      ]
    )

    assert_equal "料理名を特定できませんでした", result[:content]
  end

  test "複数領域の実応答から確信度を満たす品目だけ自動入力する" do
    result = scan(
      [
        {
          "recognition_results" => [
            { "name" => "grilled fish", "prob" => 0.32 },
            { "name" => "grilled salmon", "prob" => 0.32 },
            { "name" => "grilled blue fish", "prob" => 0.32 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "lemon", "prob" => 0.315 },
            { "name" => "lime", "prob" => 0.2 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "kiwi", "prob" => 0.329 },
            { "name" => "mango", "prob" => 0.189 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "taugé", "prob" => 0.492 },
            { "name" => "endives", "prob" => 0.255 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "spring rolls", "prob" => 0.274 },
            { "name" => "gyoza", "prob" => 0.236 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "grilled salmon", "prob" => 0.562 },
            { "name" => "grilled hake", "prob" => 0.115 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "rice", "prob" => 0.253 },
            { "name" => "mixed rice", "prob" => 0.237 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "asparagus", "prob" => 0.347 },
            { "name" => "watercress", "prob" => 0.204 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "cucumber", "prob" => 0.406 },
            { "name" => "salad", "prob" => 0.212 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "grilled fish", "prob" => 0.32 },
            { "name" => "grilled salmon", "prob" => 0.32 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "grilled salmon", "prob" => 0.323 },
            { "name" => "rice", "prob" => 0.257 }
          ]
        },
        {
          "recognition_results" => [
            { "name" => "grilled fish", "prob" => 0.32 },
            { "name" => "grilled salmon", "prob" => 0.32 }
          ]
        }
      ],
      translations: {}
    )

    assert_equal "焼き鮭、もやし、きゅうり", result[:content]
  end

  test "料理名を品目の途中で切らず255文字以内に収める" do
    regions = 12.times.map do |index|
      {
        "recognition_results" => [
          { "name" => "dish#{index}-#{'x' * 25}", "prob" => 0.9 - index * 0.01 }
        ]
      }
    end
    result = scan(regions)

    assert_operator result[:content].length, :<=, 255
    assert_equal 8, result[:content].split("、").length
    assert result[:content].end_with?("dish7-#{'x' * 25}")
  end

  test "栄養情報がない場合は栄養値を nil にする" do
    result = scan([], has_nutrition: false)

    assert_equal "料理名を特定できませんでした", result[:content]
    assert_nil result[:calories]
    assert_nil result[:protein_g]
    assert_nil result[:fat_g]
    assert_nil result[:carbs_g]
    assert_not result.key?(:fiber_g)
  end

  test "LogMeal のバイナリエラー応答を文字コード例外にせず HTTP エラーとして扱う" do
    response = Net::HTTPResponse.new("1.1", "413", "Payload Too Large")
    response.instance_variable_set(:@read, true)
    response.instance_variable_set(:@body, "invalid response \xFF".b)
    uri = URI("https://api.logmeal.com/v2/test")
    client = MealScanner::LogmealClient.allocate

    Net::HTTP.stub(:start, ->(*, **, &) { response }) do
      error = assert_raises(MealScanner::ApiError) do
        client.send(:perform_request, uri, Net::HTTP::Get.new(uri))
      end

      assert_equal "LogMeal", error.service
      assert_equal 413, error.status
      assert_equal "LogMeal API error: HTTP 413", error.message
    end
  end

  private

  def scan(segmentation_results, translations: {}, has_nutrition: true)
    recognition = {
      "imageId" => 123,
      "segmentation_results" => segmentation_results
    }

    photo = Object.new
    client = Minitest::Mock.new
    client.expect(:recognize, recognition, [ photo ])
    client.expect(:ingredients, [], [ 123 ])
    client.expect(
      :nutritional_info,
      {
        "hasNutritionalInfo" => has_nutrition,
        "nutritional_info" => {
          "totalNutrients" => {
            "ENERC_KCAL" => { "quantity" => 501.4 },
            "PROCNT" => { "quantity" => 21.25 },
            "FAT" => { "quantity" => 18.56 },
            "CHOCDF" => { "quantity" => 62.34 },
            "FIBTG" => { "quantity" => 7.89 }
          }
        }
      },
      [ 123 ]
    )

    translator = Object.new
    translator.define_singleton_method(:translate_many) do |names|
      @translated_names = names
      names.map { |name| translations.fetch(name, name) }
    end
    translator.define_singleton_method(:translated_names) do
      @translated_names
    end

    MealScanner::LogmealClient.stub(:new, client) do
      MealScanner::DeeplTranslator.stub(:new, translator) do
        result = MealScanner.call(photo: photo)
        client.verify
        @translated_names = translator.translated_names
        result
      end
    end
  end
end
