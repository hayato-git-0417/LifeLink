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

      translate_many([ text ]).first
    end

    def translate_many(texts)
      return [] if texts.empty?

      uri = URI(API_URL)
      request = Net::HTTP::Post.new(uri)
      request["Authorization"] = "DeepL-Auth-Key #{@api_key}"
      request["Content-Type"] = "application/x-www-form-urlencoded"

      parameters = texts.map { |text| [ "text", text ] }
      parameters.concat([ [ "source_lang", "EN" ], [ "target_lang", "JA" ] ])
      request.body = URI.encode_www_form(parameters)

      response = Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: true,
        open_timeout: 10,
        read_timeout: 30
      ) { |http| http.request(request) }

      raise ApiError.new(service: "DeepL", status: response.code.to_i) unless response.is_a?(Net::HTTPSuccess)

      data = JSON.parse(response.body.to_s.dup.force_encoding(Encoding::UTF_8))
      translated = Array(data["translations"]).map do |translation|
        translation["text"].to_s.strip
      end

      if translated.length != texts.length || translated.any?(&:empty?)
        raise "DeepL returned incomplete translations"
      end

      translated
    rescue JSON::ParserError, Encoding::InvalidByteSequenceError
      raise ApiError.new(service: "DeepL")
    end
  end
end
