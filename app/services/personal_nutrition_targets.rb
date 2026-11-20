# 成人の維持エネルギーの目安。Mifflin-St Jeor式（REE）に活動係数を掛ける。
# https://pubmed.ncbi.nlm.nih.gov/2305711/
# https://kennet.mhlw.go.jp/information/information/food/e-02-001
class PersonalNutritionTargets
  ACTIVITY_LABELS = { "low" => "座って過ごすことが多い", "moderate" => "日常的に適度に動く", "high" => "立ち仕事や運動でよく動く" }.freeze
  FACTORS = { "low" => 1.5, "moderate" => 1.75, "high" => 2.0 }.freeze
  KEYS = %i[calorie_goal protein_goal_g fat_goal_g carbs_goal_g].freeze

  def self.call(birthdate:, gender:, height_cm:, weight_kg:, activity_level:, on: Time.zone.today)
    age = User.age_on(birthdate, on: on)
    raise ArgumentError, "生年月日は今日以前の日付にしてください" if age.negative?
    raise ArgumentError, "性別を選択してください" unless %w[male female].include?(gender.to_s)
    raise ArgumentError, "普段の活動量を選択してください" unless ACTIVITY_LABELS.key?(activity_level.to_s)
    height = Float(height_cm, exception: false)
    weight = Float(weight_kg, exception: false)
    raise ArgumentError, "身長と体重は0より大きく1000未満の数値で入力してください" unless [height, weight].all? { |value| value && value.finite? && value.positive? && value < 1000 }

    unless age.between?(19, 78)
      return standard_fallback(birthdate, gender, on, "体格を使うAI算出は19〜78歳の成人向けです。年齢別の食事摂取基準を表示しています。")
    end
    factor = age >= 75 ? { "low" => 1.45, "moderate" => 1.7, "high" => 1.7 }.fetch(activity_level.to_s) : FACTORS.fetch(activity_level.to_s)
    resting = 10 * weight + 6.25 * height - 5 * age + (gender.to_s == "male" ? 5 : -161)
    calories = ((resting * factor) / 10).round * 10
    unless calories.between?(1000, 5000)
      return standard_fallback(birthdate, gender, on, "この体格では一般向け計算式による自動提案を行わず、年齢別の基準を表示しています。目標は手動で調整できます。")
    end
    goals(calories, 17.5, 25).merge(
      breakfast_time: GameConfig.meal_times[:breakfast], lunch_time: GameConfig.meal_times[:lunch], dinner_time: GameConfig.meal_times[:dinner],
      basis: { age: age, gender: gender.to_s, averaged: false, height_cm: height, weight_kg: weight,
               activity_level: activity_level.to_s, activity_label: ACTIVITY_LABELS.fetch(activity_level.to_s), activity_factor: factor,
               ai_eligible: true, ai_status: "not_requested", method: "formula", source: "Mifflin-St Jeor式 × 身体活動係数、食事摂取基準の栄養バランス",
               notice: age >= 75 && activity_level.to_s == "high" ? "75歳以上は活動係数を「ふつう」までとして計算しています。" : nil }
    )
  end

  def self.goals(calories, protein_percent, fat_percent)
    calories = calories.round
    protein_percent = protein_percent.to_f
    fat_percent = fat_percent.to_f
    { calorie_goal: calories.round, protein_goal_g: (calories * protein_percent / 100 / 4).round(1),
      fat_goal_g: (calories * fat_percent / 100 / 9).round(1), carbs_goal_g: (calories * (100 - protein_percent - fat_percent) / 100 / 4).round(1) }
  end

  def self.standard_fallback(birthdate, gender, on, message)
    result = NutritionDefaults.call(birthdate: birthdate, gender: gender, on: on)
    raise ArgumentError, "この年齢の食事目標は自動算出できません。手動で設定してください" unless result
    result.merge(basis: result[:basis].merge(ai_eligible: false, ai_status: "not_applicable", method: "age_standard", notice: message))
  end
end
