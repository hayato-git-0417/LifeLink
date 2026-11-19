class MealFoodItemUpdater
  Result = Struct.new(:success, :errors, keyword_init: true) do
    def success?
      success
    end
  end

  NUTRIENT_COLUMNS = Meal::NUTRIENT_COLUMNS

  def self.call(meal:, attributes:, food_items: nil)
    new(meal, attributes, food_items).call
  end

  def initialize(meal, attributes, food_items)
    @meal = meal
    @attributes = attributes
    @food_items = food_items
  end

  def call
    unless food_items_provided?
      return save_with_existing_items if @meal.meal_food_items.exists?

      return save_meal
    end

    items, error = normalize_items
    return failure(error) if error

    foods = FoodComposition.where(id: items.map { |item| item[:food_composition_id] }.uniq).index_by(&:id)
    return failure("食品が見つかりません。画面を更新して選び直してください") if items.any? { |item| !foods.key?(item[:food_composition_id]) }

    save_meal_with_items(items, foods)
  end

  private

  def food_items_provided?
    !@food_items.nil?
  end

  def normalize_items
    raw_items = @food_items.is_a?(String) ? JSON.parse(@food_items) : @food_items
    return [ nil, "食品の指定が正しくありません" ] unless raw_items.is_a?(Array)
    return [ nil, "食品は1食につき50件までです" ] if raw_items.length > 50

    items = raw_items.map do |item|
      values = item.respond_to?(:to_h) ? item.to_h : nil
      return [ nil, "食品の指定が正しくありません" ] unless values

      raw_food_id = values["food_composition_id"] || values[:food_composition_id]
      raw_weight = values["weight_g"] || values[:weight_g]
      food_id = Integer(raw_food_id)
      weight = BigDecimal(raw_weight.to_s)
      return [ nil, "食品の量は0より大きい数値で入力してください" ] unless weight.finite? && weight.positive?

      { food_composition_id: food_id, weight_g: weight }
    rescue ArgumentError, TypeError
      return [ nil, "食品の指定が正しくありません" ]
    end

    [ items, nil ]
  rescue JSON::ParserError
    [ nil, "食品の指定が正しくありません" ]
  end

  def save_meal
    @meal.assign_attributes(@attributes)
    @meal.save ? success : failure(@meal.errors.full_messages)
  end

  def save_with_existing_items
    @meal.assign_attributes(@attributes)
    existing_items = @meal.meal_food_items.includes(:food_composition).to_a
    foods = existing_items.map(&:food_composition).index_by(&:id)
    items = existing_items.map do |item|
      { food_composition_id: item.food_composition_id, weight_g: item.weight_g }
    end
    @meal.assign_attributes(nutrient_totals(items, foods))
    @meal.save ? success : failure(@meal.errors.full_messages)
  end

  def save_meal_with_items(items, foods)
    attributes = @attributes
    attributes = attributes.merge(nutrient_totals(items, foods)) if items.any?
    saved = false
    errors = []

    Meal.transaction do
      @meal.assign_attributes(attributes)
      unless @meal.save
        errors = @meal.errors.full_messages
        raise ActiveRecord::Rollback
      end

      @meal.meal_food_items.destroy_all
      items.each do |item|
        @meal.meal_food_items.create!(
          food_composition: foods.fetch(item[:food_composition_id]),
          weight_g: item[:weight_g]
        )
      end
      saved = true
    end

    saved ? success : failure(errors)
  rescue ActiveRecord::RecordInvalid => error
    failure(error.record.errors.full_messages)
  end

  def nutrient_totals(items, foods)
    NUTRIENT_COLUMNS.to_h do |column|
      total = items.sum do |item|
        value = foods.fetch(item[:food_composition_id]).public_send(column)
        value.nil? ? 0 : value.to_d * item[:weight_g] / 100
      end
      [ column, column == :calories ? total.round(0).to_i : total.round(1) ]
    end
  end

  def success
    Result.new(success: true, errors: [])
  end

  def failure(errors)
    Result.new(success: false, errors: Array(errors))
  end
end
