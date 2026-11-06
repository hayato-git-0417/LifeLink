# app/services/meal_scanner/logmeal_client.rb
require "net/http"
require "json"

class MealScanner
  class LogmealClient
    BASE_URL = "https://api.logmeal.com/v2"

    def initialize
      @token = ENV.fetch("LOGMEAL_API_KEY")
    end

    # 写真から料理を認識する
    def recognize(photo)
      uri = URI("#{BASE_URL}/image/segmentation/complete/v1.0")
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{@token}"
      request["Accept"] = "application/json"

      request.set_form(
        [
          [
            "image",
            photo.read,
            {
              filename: photo.original_filename,
              content_type: photo.content_type
            }
          ]
        ],
        "multipart/form-data"
      )

      perform_request(uri, request)
    end

    # 認識した画像から食材情報を取得する
    def ingredients(image_id)
      post_json(
        "/nutrition/recipe/ingredients/v1.0",
        { imageId: image_id }
      )
    end

    # 認識した画像から栄養情報を取得する
    def nutritional_info(image_id)
      post_json(
        "/nutrition/recipe/nutritionalInfo/v1.0",
        { imageId: image_id }
      )
    end

    private

    # JSON形式でAPIにリクエストする
    def post_json(path, body)
      uri = URI("#{BASE_URL}#{path}")
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "Bearer #{@token}"
      request["Accept"] = "application/json"
      request["Content-Type"] = "application/json"
      request.body = body.to_json

      perform_request(uri, request)
    end

    # APIリクエストを実行してレスポンスをJSONに変換する
    def perform_request(uri, request)
      response = Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: true,
        open_timeout: 10,
        read_timeout: 30
      ) do |http|
        http.request(request)
      end

      unless response.is_a?(Net::HTTPSuccess)
        raise "LogMeal API error: HTTP #{response.code} - #{response.body}"
      end

      JSON.parse(response.body)
    end
  end
end