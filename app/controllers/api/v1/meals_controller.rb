
# 食事の記録。写真解析は保存処理と分離する。
# 写真は multipart の meal[photo] で受け取る。
module Api
  module V1
    class MealsController < BaseController
      MEAL_ATTRIBUTES = [
        :meal_type,
        :eaten_at,
        :content,
        :comment,
        :photo,
        *Meal::NUTRIENT_COLUMNS
      ].freeze

      game_api
      before_action :set_meal, only: %i[show update destroy]

      # GET /api/v1/meals?date=2026-10-06
      # GET /api/v1/meals?from=&to=
      def index
        if params[:from].present? || params[:to].present?
          range = date_range_param
          meals = current_user.meals
                              .between(range.first, range.last)
                              .order(:eaten_at)
                              .with_attached_photo

          return render json: {
            from: range.first,
            to: range.last,
            meals: meals.map { |meal| meal_json(meal) }
          }
        end

        date = date_param(:date) || Time.zone.today
        meals = current_user.meals
                            .on(date)
                            .order(:eaten_at)
                            .with_attached_photo

        render json: {
          date: date,
          meals: meals.map { |meal| meal_json(meal) }
        }
      end

      # GET /api/v1/meals/:id
      def show
        render json: { meal: meal_json(@meal) }
      end

      # POST /api/v1/meals
      # 既存の手入力登録。今回は写真解析からは呼び出さない。
      def create
        meal = current_user.meals.build(
          meal_params.merge(input_method: :manual)
        )

        return render_errors(meal.errors.full_messages) unless meal.save

        refresh_daily_achievements(meal.recorded_on)

        render json: { meal: meal_json(meal) }, status: :created
      end

      # POST /api/v1/meals/scan
      # 写真を解析し、結果を返す。食事データは保存しない。
      def scan
        photo = params.require(:meal).permit(:photo)[:photo]

        unless photo.present?
          return render_errors(["写真を選択してください"])
        end

        result = MealScanner.call(photo: photo)

        unless result.present?
          return render_errors(["写真を解析できませんでした"])
        end

        render json: { scan: result }
      rescue ActionController::ParameterMissing
        render_errors(["写真を選択してください"])
      rescue StandardError => e
        Rails.logger.error(
          "[MealScanner] #{e.class}: #{e.message}"
        )
        render_errors(["写真の解析に失敗しました"])
      end

      # PATCH /api/v1/meals/:id
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
        recorded_on = @meal.recorded_on
        @meal.destroy!
        refresh_daily_achievements(recorded_on)
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
        ActiveModel::Type::Boolean.new.cast(
          params.dig(:meal, :remove_photo)
        )
      end

      def meal_json(meal)
        numeric_json(
          meal.slice(
            :id,
            :meal_type,
            :eaten_at,
            :content,
            :comment,
            :input_method,
            :recorded_on,
            *Meal::NUTRIENT_COLUMNS
          )
        ).merge(
          photo_url: meal.photo.attached? ?
            rails_blob_path(meal.photo, only_path: true) : nil
        )
      end
    end
  end
end
