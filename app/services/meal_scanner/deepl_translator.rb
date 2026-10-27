require "net/http"
require "json"

class MealScanner
  class DeeplTranslator
    API_URL = "https://api-free.deepl.com/v2/translate"

    def initialize
      @api_key = ENV.fetch("DEEPL_API_KEY")
    end

    def translate(text)
      return text if text.to_s.strip.empty?

      uri = URI(API_URL)
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "DeepL-Auth-Key #{@api_key}"
      request["Content-Type"] = "application/x-www-form-urlencoded"

      request.body = URI.encode_www_form(
        text: text,
        source_lang: "EN",
        target_lang: "JA"
      )

      response = Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: true,
        open_timeout: 10,
        read_timeout: 30
      ) { |http| http.request(request) }

      unless response.is_a?(Net::HTTPSuccess)
        raise "DeepL API error: HTTP #{response.code} - #{response.body}"
      end

      data = JSON.parse(response.body)
      translated = data.dig("translations", 0, "text").to_s.strip

      raise "DeepL returned an empty translation" if translated.empty?

      translated
    end
  end
end