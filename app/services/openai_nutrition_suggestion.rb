require "net/http"
require "json"

class OpenaiNutritionSuggestion
  class Unavailable < StandardError; end
  URL = URI("https://api.openai.com/v1/responses")
  SCHEMA = {
    type: "object", properties: { calorie_goal: { type: "integer" }, protein_percent: { type: "number" }, fat_percent: { type: "number" }, reason: { type: "string" } },
    required: %w[calorie_goal protein_percent fat_percent reason], additionalProperties: false
  }.freeze

  def self.call(profile:, baseline:)
    key = ENV["OPENAI_API_KEY"].to_s.strip
    raise Unavailable if key.empty?
    payload = {
      model: ENV["OPENAI_NUTRITION_MODEL"].to_s.strip.presence || "gpt-5.4-mini", store: false, max_output_tokens: 1500,
      input: [{ role: "user", content: [{ type: "input_text", text: <<~PROMPT }] }],
        一般の成人の現在の体重を維持するための1日分の食事目標を提案してください。
        減量・増量・治療を目的としたカロリー削減や、診断・治療の助言は行いません。
        入力データ: #{JSON.generate(profile)}
        計算式による目安: #{baseline[:calorie_goal]} kcal/日。
        calorie_goalはこの目安の90〜110%以内。活動量を既に考慮済みなので活動係数をもう一度掛けないでください。
        たんぱく質は年齢に応じ13〜20%（50〜64歳は14〜20%、65歳以上は15〜20%）、脂質は20〜30%、残りの炭水化物は50〜65%のエネルギー比率とします。
        protein_percentとfat_percentを返し、gへの換算はサーバーで行います。
        reasonは100文字程度の日本語で、推定の目安であることと活動量を考慮した説明だけを記載してください。
        年齢と生活習慣から病気、妊娠、減量の必要性などを推測しないでください。
      PROMPT
      text: { format: { type: "json_schema", name: "nutrition_suggestion", strict: true, schema: SCHEMA } }
    }
    request = Net::HTTP::Post.new(URL)
    request["Authorization"] = "Bearer #{key}"
    request["Content-Type"] = "application/json"
    request.body = JSON.generate(payload)
    response = Net::HTTP.start(URL.host, URL.port, use_ssl: true, open_timeout: 5, read_timeout: 20) { |http| http.request(request) }
    raise Unavailable unless response.is_a?(Net::HTTPSuccess)
    body = JSON.parse(response.body)
    raise Unavailable unless body["status"] == "completed"
    output = Array(body["output"]).flat_map { |item| item["content"] || [] }.filter_map { |part| part["text"] if part["type"] == "output_text" }.join
    JSON.parse(output)
  rescue Unavailable
    raise
  rescue StandardError
    raise Unavailable
  end
end
