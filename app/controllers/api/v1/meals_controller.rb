# 食事の記録（spec.md 2章・6章）。今回は手入力だけ。写真は multipart の meal[photo] で受け取り、
# レスポンスの photo_url（/rails/active_storage/... の相対パス）で表示する。
module Api
  module V1
    class MealsController < BaseController
      MEAL_ATTRIBUTES = [ :meal_type, :eaten_at, :content, :comment, :photo, *Meal::NUTRIENT_COLUMNS ].freeze

      game_api
      before_action :set_meal, only: %i[show update destroy]

      # GET /api/v1/meals?date=2026-10-06（省略時は今日。食べた時刻の順）
      def index
        date = date_param(:date) || Time.zone.today
        meals = current_user.meals.on(date).order(:eaten_at).with_attached_photo
        render json: { date: date, meals: meals.map { |meal| meal_json(meal) } }
      end

      # GET /api/v1/meals/:id
      def show
        render json: { meal: meal_json(@meal) }
      end

      # POST /api/v1/meals
      def create
        meal = current_user.meals.build(meal_params.merge(input_method: :manual))
        return render_errors(meal.errors.full_messages) unless meal.save

        refresh_daily_achievements(meal.recorded_on)
        render json: { meal: meal_json(meal) }, status: :created
      end

      # PATCH /api/v1/meals/:id（meal[remove_photo]=true で写真を外す）
      def update
        old_date = @meal.recorded_on
        @meal.assign_attributes(meal_params)
        @meal.photo = nil if remove_photo? && !meal_params.key?(:photo)
        return render_errors(@meal.errors.full_messages) unless @meal.save

        refresh_daily_achievements(old_date, @meal.recorded_on)
        render json: { meal: meal_json(@meal) }
      end

      # DELETE /api/v1/meals/:id
      def destroy
        @meal.destroy!
        refresh_daily_achievements(@meal.recorded_on)
        head :no_content
      end

      private

      def set_meal
        @meal = current_user.meals.find(params[:id])
      end

      def meal_params
        @meal_params ||= params.require(:meal).permit(*MEAL_ATTRIBUTES)
      end

      def remove_photo?
        ActiveModel::Type::Boolean.new.cast(params.dig(:meal, :remove_photo))
      end

      def meal_json(meal)
        numeric_json(
          meal.slice(:id, :meal_type, :eaten_at, :content, :comment, :input_method, :recorded_on, *Meal::NUTRIENT_COLUMNS)
        ).merge(photo_url: meal.photo.attached? ? rails_blob_path(meal.photo, only_path: true) : nil)
      end
    end
  end
end
