module Api
  module V1
    class GoalsController < BaseController
      # 新規登録④はユーザー作成前に表示するので、初期値の取得はログインなしでも使える
      skip_before_action :authenticate_user!, only: %i[nutrition_defaults nutrition_suggestion]

      GOAL_ATTRIBUTES = %i[
        sleep_goal_type sleep_goal_minutes bedtime wake_time work_goal_minutes
        calorie_goal protein_goal_g fat_goal_g carbs_goal_g
        breakfast_time lunch_time dinner_time
      ].freeze
      TIME_ATTRIBUTES = %i[bedtime wake_time breakfast_time lunch_time dinner_time].freeze

      # GET /api/v1/goal（未登録なら goal: null）
      def show
        render json: goal_json(current_user.goal)
      end

      # PUT /api/v1/goal
      #   { "goal": { ... }, "exercise_tasks": [{ "id": 1, "title": "..." }, { "title": "..." }] }
      def update
        result = GoalUpdater.call(
          user: current_user,
          goal_params: params.require(:goal).permit(*GOAL_ATTRIBUTES),
          tasks_params: params.permit(exercise_tasks: %i[id title]).fetch(:exercise_tasks, [])
        )
        return render_errors(result.errors) unless result.success?

        render json: goal_json(result.goal)
      end

      # GET /api/v1/goal/nutrition_defaults?birthdate=2006-10-13&gender=male
      #   パラメータがなければログイン中のユーザーの生年月日・性別を使う
      def nutrition_defaults
        profile = nutrition_profile
        return if performed?
        defaults = if profile[:height_cm].present? && profile[:weight_kg].present? && profile[:activity_level].present? && %w[male female].include?(profile[:gender])
          PersonalNutritionTargets.call(**profile)
        else
          result = NutritionDefaults.call(birthdate: profile[:birthdate], gender: profile[:gender])
          result && result.merge(basis: result[:basis].merge(ai_eligible: false, notice: "身長・体重・普段の活動量を登録すると、体格を使った目標を算出できます。"))
        end
        return render_errors(I18n.t("api.errors.not_found"), status: :not_found) unless defaults
        render json: { nutrition_defaults: defaults }
      rescue Date::Error
        render_errors("生年月日を正しい日付で入力してください")
      rescue ArgumentError => error
        render_errors(error.message)
      end

      # POST: 食事目標の初期化・再計算時に呼び出す。登録前も利用可能。
      def nutrition_suggestion
        profile = nutrition_profile
        return if performed?
        baseline = PersonalNutritionTargets.call(**profile)
        render json: { nutrition_defaults: NutritionSuggestion.call(baseline: baseline, client_id: request.remote_ip) }
      rescue Date::Error
        render_errors("生年月日を正しい日付で入力してください")
      rescue ArgumentError => error
        render_errors(error.message)
      end

      private

      def nutrition_profile
        profile = if params[:birthdate].blank? && current_user
          { birthdate: current_user.birthdate, gender: current_user.gender,
            height_cm: current_user.height_cm, weight_kg: current_user.weight_kg, activity_level: current_user.activity_level }
        else
          { birthdate: Date.iso8601(params.require(:birthdate).to_s), gender: params[:gender].presence || "unspecified",
            height_cm: params[:height_cm], weight_kg: params[:weight_kg], activity_level: params[:activity_level] }
        end
        return render_errors("生年月日は今日以前の日付にしてください") if profile[:birthdate] > Time.zone.today
        return render_errors("1歳未満の食事目標は自動設定できません。各項目を入力してください") if User.age_on(profile[:birthdate]) < 1
        return render_errors("性別を選択してください") unless User.genders.key?(profile[:gender])
        profile
      end

      def goal_json(goal)
        tasks = current_user.exercise_tasks.active.ordered
        {
          # DECIMAL は JSON で文字列になるので数値に直す。時刻は "HH:MM"
          goal: goal && goal.slice(*GOAL_ATTRIBUTES)
                            .transform_values { |value| value.is_a?(BigDecimal) ? value.to_f : value }
                            .merge(
                              TIME_ATTRIBUTES.index_with { |column| goal[column]&.strftime("%H:%M") },
                              target_sleep_minutes: goal.target_sleep_minutes
                            ),
          exercise_tasks: tasks.map { |task| task.slice(:id, :title, :position) }
        }
      end
    end
  end
end
