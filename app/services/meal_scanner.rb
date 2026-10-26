
# 食事の写真から料理名・栄養値を取得する
class MealScanner
  def self.call(photo:)
    new(photo: photo).call
  end

  def initialize(photo:)
    @photo = photo
  end

  def call
    client = MealScanner::LogmealClient.new

    # 写真から料理・食材を認識
    recognition = client.recognize(@photo)
    image_id = recognition["imageId"]

    raise "LogMeal response has no imageId" unless image_id

    # 食材と栄養情報を取得
    ingredients = client.ingredients(image_id)
    nutrition = client.nutritional_info(image_id)

    totals =
      nutrition.dig("nutritional_info", "totalNutrients") || {}

    # 栄養情報が取得できなかった場合は nil にする
    has_nutrition = nutrition["hasNutritionalInfo"]

    {
      content: extract_dish_name(recognition),
      calories: has_nutrition ? nutrient_quantity(totals, "ENERC_KCAL", 0) : nil,
      protein_g: has_nutrition ? nutrient_quantity(totals, "PROCNT", 1) : nil,
      fat_g: has_nutrition ? nutrient_quantity(totals, "FAT", 1) : nil,
      carbs_g: has_nutrition ? nutrient_quantity(totals, "CHOCDF", 1) : nil,
      fiber_g: has_nutrition ? nutrient_quantity(totals, "FIBTG", 1) : nil,
      ingredients: ingredients
    }
  end


  private

  # よく認識される料理名・食材名の日本語辞書

FOOD_NAME_TRANSLATIONS = {
  "grilled salmon" => "焼き鮭",
  "salmon" => "鮭",
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

  # 認識した料理名を日本語に変換してまとめる

  def extract_dish_name(response)
    names = (response["segmentation_results"] || []).filter_map do |item|
      item.dig("recognition_results", 0, "name")
    end.uniq

    return "料理名を特定できませんでした" if names.empty?

    names.map { |name| translate_food_name(name) }.join("、")
  end

def translate_food_name(name)
  return name if name.to_s.strip.empty?

  MealScanner::DeeplTranslator.new.translate(name)
end  # 栄養素の値を取得して丸める
  def nutrient_quantity(totals, code, precision)
    value = totals.dig(code, "quantity")
    return nil if value.nil?

    value.round(precision)
  end
end
