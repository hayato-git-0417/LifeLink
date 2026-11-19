require "digest"

class NutritionSuggestion
  def self.cache
    Rails.cache.is_a?(ActiveSupport::Cache::NullStore) ? (@cache ||= ActiveSupport::Cache::MemoryStore.new(size: 2.megabytes)) : Rails.cache
  end

  def self.call(baseline:, client_id:)
    return baseline unless baseline.dig(:basis, :ai_eligible)
    basis = baseline.fetch(:basis)
    profile = basis.slice(:age, :gender, :height_cm, :weight_kg, :activity_level, :activity_factor)
    key = "nutrition-ai:v1:#{Digest::SHA256.hexdigest(JSON.generate(profile))}:#{ENV['OPENAI_NUTRITION_MODEL']}"
    cached = cache.read(key)
    return cached if cached
    # 未登録ユーザーも利用するため、同じ接続元からの連続した有料API呼び出しを抑制する。
    throttle = "nutrition-ai-client:#{Digest::SHA256.hexdigest(client_id.to_s)}"
    unless cache.write(throttle, true, expires_in: 15.seconds, unless_exist: true)
      return fallback(baseline, "短時間の再提案を控えるため、計算式による目安を表示しています。少し待ってから再度お試しください。")
    end
    result = OpenaiNutritionSuggestion.call(profile: profile, baseline: baseline)
    calories, protein, fat = result.values_at("calorie_goal", "protein_percent", "fat_percent")
    min_protein = basis[:age] >= 65 ? 15 : basis[:age] >= 50 ? 14 : 13
    valid = [calories, protein, fat].all? { |value| value.is_a?(Numeric) && value.finite? }
    valid &&= calories.between?(baseline[:calorie_goal] * 0.9, baseline[:calorie_goal] * 1.1) && protein.between?(min_protein, 20) && fat.between?(20, 30) && (100 - protein - fat).between?(50, 65)
    return fallback(baseline) unless valid
    suggestion = baseline.merge(PersonalNutritionTargets.goals(calories, protein, fat))
    suggestion[:basis] = basis.merge(method: "ai", ai_status: "applied", source: "体格・活動量に基づく計算を基準にしたAI提案", explanation: result["reason"].to_s.strip[0, 300])
    cache.write(key, suggestion, expires_in: 6.hours)
    suggestion
  rescue StandardError => error
    Rails.logger.warn("[NutritionSuggestion] fallback: #{error.class}")
    fallback(baseline)
  end

  def self.fallback(baseline, message = "AI提案を取得できなかったため、計算式による目安を表示しています。手動で調整することもできます。")
    baseline.merge(basis: baseline[:basis].merge(ai_status: "fallback", notice: message))
  end
end
