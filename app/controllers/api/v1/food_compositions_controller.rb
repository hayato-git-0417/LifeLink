module Api
  module V1
    class FoodCompositionsController < BaseController
      # GET /api/v1/food_compositions?q=ごはん
      def index
        query = params[:q].to_s.strip
        foods = if query.length < 1
          FoodComposition.none
        else
          escaped_query = FoodComposition.sanitize_sql_like(query)
          FoodComposition.where("name LIKE :query OR food_code = :code", query: "%#{escaped_query}%", code: query)
                        .order(:name)
                        .limit(20)
        end

        render json: { foods: foods.map { |food| food_json(food) } }
      end

      private

      def food_json(food)
        numeric_json(food.slice(:id, :food_code, :name, *Meal::NUTRIENT_COLUMNS))
      end
    end
  end
end
