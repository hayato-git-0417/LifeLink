# 年齢・性別から食事の目標の初期値を出す（新規登録④・目標変更で表示する値）。
# 値は nutrition_standards（日本人の食事摂取基準 2025年版・身体活動レベル「ふつう」）から引く。
#   - 性別が未回答・その他 → 男性と女性の平均（spec.md 2章）
#   - 18歳未満 → 一番若い区分（18〜29歳）の値【仮: docs/decisions.md】
#   - 基準にない年齢（上限より上）→ 一番上の区分の値
class NutritionDefaults
  NUTRIENT_KEYS = {
    calorie_goal: :calories,
    protein_goal_g: :protein_g,
    fat_goal_g: :fat_g,
    carbs_goal_g: :carbs_g,
    fiber_goal_g: :fiber_g
  }.freeze
  STANDARD_GENDERS = %w[male female].freeze

  def self.call(...) = new(...).call

  # gender は User の enum の値（unspecified / male / female / other）
  def initialize(birthdate:, gender:, on: Time.zone.today)
    @age = User.age_on(birthdate, on: on)
    @gender = gender.to_s
  end

  def call
    standards = target_genders.map { |gender| standard_for(gender) }.compact
    return nil if standards.empty?

    nutrients = NUTRIENT_KEYS.to_h do |goal_key, column|
      values = standards.map { |standard| standard[column].to_f }
      average = values.sum / values.size
      [ goal_key, goal_key == :calorie_goal ? average.round : average.round(1) ]
    end

    nutrients.merge(
      breakfast_time: GameConfig.meal_times[:breakfast],
      lunch_time: GameConfig.meal_times[:lunch],
      dinner_time: GameConfig.meal_times[:dinner],
      basis: { age: @age, gender: @gender, averaged: standards.size > 1, source: "日本人の食事摂取基準（2025年版）身体活動レベル ふつう" }
    )
  end

  private

  def target_genders
    STANDARD_GENDERS.include?(@gender) ? [ @gender ] : STANDARD_GENDERS
  end

  def standard_for(gender)
    rows = NutritionStandard.moderate.where(gender: gender).order(:age_from)
    rows.for_age(@age).first || (@age < rows.first&.age_from.to_i ? rows.first : rows.last)
  end
end
