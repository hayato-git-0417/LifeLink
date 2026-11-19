# 食事の写真から料理名・栄養値を取得する
class MealScanner
  class ApiError < StandardError
    attr_reader :service, :status

    def initialize(service:, status: nil)
      @service = service
      @status = status
      message = status ? "#{service} API error: HTTP #{status}" : "#{service} API returned invalid JSON"
      super(message)
    end
  end

  MIN_DISH_PROBABILITY = 0.4
  MIN_DISH_PROBABILITY_MARGIN = 0.08
  MAX_DISH_NAMES = 12
  MAX_CONTENT_LENGTH = 255

  FOOD_NAME_TRANSLATIONS = {
    "grilled salmon" => "焼き鮭",
    "grilled fish" => "焼き魚",
    "salmon" => "鮭",
    "taugé" => "もやし",
    "fried rice" => "チャーハン",
    "white rice" => "白米",
    "rice" => "ご飯",
    "chicken breast" => "鶏むね肉",
    "chicken" => "鶏肉",
    "beef" => "牛肉",
    "pork" => "豚肉",
    "boiled egg" => "ゆで卵",
    "egg" => "卵",
    "broccoli" => "ブロッコリー",
    "tomato" => "トマト",
    "potato" => "じゃがいも",
    "carrot" => "にんじん",
    "cucumber" => "きゅうり",
    "asparagus" => "アスパラガス",
    "lemon" => "レモン",
    "kiwi" => "キウイ",
    "spring rolls" => "春巻き",
    "bread" => "パン",
    "pasta" => "パスタ",
    "salad" => "サラダ"
  }.freeze

  def self.call(photo:)
    OpenaiMealScanner.call(photo: photo)
  end

  def initialize(photo:)
    @photo = photo
  end

  def call
    client = MealScanner::LogmealClient.new
    recognition = client.recognize(@photo)
    image_id = recognition["imageId"]

    raise "LogMeal response has no imageId" unless image_id

    ingredients = client.ingredients(image_id)
    nutrition = client.nutritional_info(image_id)
    dish_names = extract_dish_names(recognition)
    translations = translate_food_names(dish_names)
    content = build_content(dish_names.map { |name| translations.fetch(name) })
    totals = nutrition.dig("nutritional_info", "totalNutrients") || {}

    {
      content: content.presence || "料理名を特定できませんでした",
      calories: nutrition["hasNutritionalInfo"] ? nutrient_quantity(totals, "ENERC_KCAL", 0) : nil,
      protein_g: nutrition["hasNutritionalInfo"] ? nutrient_quantity(totals, "PROCNT", 1) : nil,
      fat_g: nutrition["hasNutritionalInfo"] ? nutrient_quantity(totals, "FAT", 1) : nil,
      carbs_g: nutrition["hasNutritionalInfo"] ? nutrient_quantity(totals, "CHOCDF", 1) : nil,
      ingredients: ingredients
    }
  end

  private

  def extract_dish_names(response)
    predictions = {}

    Array(response["segmentation_results"]).each do |region|
      candidates = Array(region["recognition_results"]).filter_map do |item|
        name = item["name"].to_s.strip
        score = item["prob"]
        next if name.empty? || !score.is_a?(Numeric)
        next unless score.between?(0, 1)

        { name: name.downcase, score: score }
      end.sort_by { |item| -item[:score] }

      candidate, alternative = candidates
      next unless candidate
      next if candidate[:score] < MIN_DISH_PROBABILITY
      if alternative && candidate[:score] - alternative[:score] < MIN_DISH_PROBABILITY_MARGIN
        next
      end

      prediction = predictions[candidate[:name]] ||= { score: 0, count: 0 }
      prediction[:score] = [ prediction[:score], candidate[:score] ].max
      prediction[:count] += 1
    end

    predictions
      .sort_by { |name, prediction| [ -prediction[:score], name ] }
      .first(MAX_DISH_NAMES)
      .map(&:first)
  end

  def build_content(names)
    content_names = []

    names.each do |name|
      candidate = (content_names + [ name ]).join("、")
      break if candidate.length > MAX_CONTENT_LENGTH

      content_names << name
    end

    content_names.join("、")
  end

  def translate_food_names(names)
    translations = {}
    untranslated = []

    names.each do |name|
      known_translation = FOOD_NAME_TRANSLATIONS[name.downcase]
      if known_translation
        translations[name] = known_translation
      else
        untranslated << name
      end
    end

    if untranslated.any?
      translated = MealScanner::DeeplTranslator.new.translate_many(untranslated)
      untranslated.zip(translated).each do |name, translation|
        translations[name] = translation
      end
    end

    translations
  end

  def nutrient_quantity(totals, code, precision)
    value = totals.dig(code, "quantity")
    return nil if value.nil?

    value.round(precision)
  end
end
