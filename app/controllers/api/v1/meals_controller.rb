
# 食事の記録。
# 写真解析はOpenAI APIを使用し、保存処理と分離する。
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
                              .includes(meal_food_items: :food_composition)

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
                            .includes(meal_food_items: :food_composition)

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
      # 食事データの保存。
      # 写真解析とは別に実行する。
      def create
        meal = current_user.meals.build(input_method: :manual)

        result = save_meal(meal)

        return render_errors(result.errors) unless result.success?

        refresh_daily_achievements(meal.recorded_on)
        award_evolution_points(:meal)

        render json: {
          meal: meal_json(meal)
        }, status: :created
      end

      # POST /api/v1/meals/scan
      #
      # OpenAI APIによる写真解析。
      #
      # 1. 写真を受け取る
      # 2. ImageNormalizerで画像を最適化
      # 3. OpenAI APIで画像を判定
      # 4. 解析対象であれば料理名と栄養素を取得
      # 5. 結果をJSONで返す
      #
      # イラスト・CG・架空の食べ物などは拒否する。
      # この段階ではデータベースに保存しない。
      def scan
        scan_params = params.require(:meal).permit(:photo, :content)
        photo = scan_params[:photo]

        unless photo.present?
          return render_errors(["写真を選択してください"])
        end

        Rails.logger.info(
          "[MealScanner] OpenAI画像解析を開始"
        )

        # 既存の画像圧縮・正規化処理を使用
        result = MealScanner::ImageNormalizer.with_upload(photo) do |converted_photo|

          # OpenAI APIで画像の種類と料理を判定
          OpenaiMealScanner.call(photo: converted_photo, content_hint: scan_params[:content])

        end

        unless result.present?
          return render_errors([
            "写真を解析できませんでした"
          ])
        end

        # 料理名が取得できているか確認
        content = result[:content] || result["content"]

        if content.blank?
          return render_errors([
            "料理を認識できませんでした。別の写真でお試しください"
          ])
        end

        Rails.logger.info(
          "[MealScanner] OpenAI画像解析成功: #{content}"
        )

        # 料理名・栄養素のみを返す
        # この時点では食事データを保存しない
        render json: {
          scan: result
        }

      # 写真パラメータがない場合
      rescue ActionController::ParameterMissing
        render_errors([
          "写真を選択してください"
        ])

      # イラスト・CG・架空の料理などの解析拒否
      rescue OpenaiMealScanner::UnsupportedImageError => e
        Rails.logger.info(
          "[MealScanner] 解析対象外の画像: #{e.message}"
        )

        render_errors([e.message])

      # 画像サイズ・画像形式などのエラー
      rescue ArgumentError => e
        Rails.logger.warn(
          "[MealScanner] 画像エラー: #{e.message}"
        )

        message =
          if e.message.include?("大きすぎます")
            "画像サイズが大きすぎます。小さめの写真を選択してください"

          elsif e.message.include?("対応") ||
                e.message.include?("JPEG") ||
                e.message.include?("写真が空")
            "対応していない画像形式です。JPEG形式の写真をお試しください"

          else
            "写真を確認して、もう一度お試しください"
          end

        render_errors([message])

      # OpenAI APIやその他のエラー
      rescue StandardError => e
        Rails.logger.error(
          "[MealScanner] #{e.class}: #{e.message}"
        )

        # OpenAI APIが返したHTTPステータスを取得
        status_match = e.message.match(
          /OpenAI APIエラー \(HTTP (\d{3})\)/
        )

        status = status_match && status_match[1].to_i

        message = case status
        when 400
          "写真解析リクエストに問題があります。管理者にお問い合わせください"

        when 401, 403
          "OpenAI APIの認証に失敗しました。APIキーを確認してください"

        when 404
          "指定されたAIモデルを利用できません。モデルの設定を確認してください"

        when 413
          "写真のサイズが大きすぎます。小さめの写真でお試しください"

        when 429
          if e.message.include?("no credits remaining")
            "OpenAI APIのクレジット残高がありません。支払い設定を確認してください"
          else
            "OpenAI APIの利用上限、またはリクエスト制限に達しました"
          end

        when 500, 502, 503, 504
          "OpenAI APIで一時的なエラーが発生しました。再度お試しください"

        else
          "写真の解析に失敗しました。もう一度お試しください"
        end

        render_errors([message])
      end

      # PATCH /api/v1/meals/:id
      def update
        old_date = @meal.recorded_on

        if remove_photo? && !meal_params.key?(:photo)
          @meal.photo = nil
        end

        result = save_meal(@meal)

        return render_errors(result.errors) unless result.success?

        refresh_daily_achievements(
          old_date,
          @meal.recorded_on
        )

        render json: {
          meal: meal_json(@meal)
        }
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
        @meal_params ||= params.require(:meal).permit(
          *MEAL_ATTRIBUTES,
          :food_items_json
        )
      end

      def save_meal(meal)
        attrs = meal_params.except(:food_items_json)

        food_items =
          if meal_params.key?(:food_items_json)
            meal_params[:food_items_json]
          end

        if attrs.key?(:meal_type) && !Meal.meal_types.key?(attrs[:meal_type].to_s)
          meal.errors.add(:meal_type, :inclusion)
          return MealFoodItemUpdater::Result.new(success: false, errors: meal.errors.full_messages)
        end

        current_user.with_lock do
          meal.assign_attributes(attrs)
          attrs[:meal_type] = MealTypeClassifier.call(user: current_user, eaten_at: meal.eaten_at)
          MealFoodItemUpdater.call(
            meal: meal,
            attributes: attrs,
            food_items: food_items
          )
        end
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
            rails_blob_path(
              meal.photo,
              only_path: true
            ) : nil,

          food_items: meal.meal_food_items
                          .includes(:food_composition)
                          .map do |item|

            food = item.food_composition

            {
              id: item.id,
              food_composition_id: food.id,
              name: food.name,
              weight_g: item.weight_g.to_f,
              **numeric_json(
                food.slice(*Meal::NUTRIENT_COLUMNS)
              )
            }
          end
        )
      end
    end
  end
end
