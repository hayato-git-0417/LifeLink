require "net/http"
require "json"

class MealScanner
  class GeminiTranslator
    API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"

    def initialize
      @api_key = ENV.fetch("GEMINI_API_KEY")
    end

    def translate(text)
      uri = URI(API_URL)
      request = Net::HTTP::Post.new(uri)
      request["x-goog-api-key"] = @api_key
      request["Content-Type"] = "application/json"

      request.body = {
        contents: [
          {
            parts: [
              {
                text: "次の料理名を自然な日本語に翻訳してください。説明や引用符は付けず、料理名だけを返してください。\n料理名: #{text}"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 100
        }
      }.to_json

      response = Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: true,
        open_timeout: 10,
        read_timeout: 30
      ) { |http| http.request(request) }

      unless response.is_a?(Net::HTTPSuccess)
        raise "Gemini API error: HTTP #{response.code} - #{response.body}"
      end

      data = JSON.parse(response.body)
      translated = data.dig(
        "candidates", 0, "content", "parts", 0, "text"
      )

      result = translated.to_s.strip
      raise "Gemini returned an empty translation" if result.empty?

      result
    end
  end
end