module Api
  module V1
    class GoalsController < BaseController
      # 新規登録④はユーザー作成前に表示するので、初期値の取得はログインなしでも使える
      skip_before_action :authenticate_user!, only: :nutrition_defaults

      GOAL_ATTRIBUTES = %i[
        sleep_goal_type sleep_goal_minutes bedtime wake_time work_goal_minutes
        calorie_goal protein_goal_g fat_goal_g carbs_goal_g fiber_goal_g
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
        birthdate, gender = nutrition_basis
        return if performed?

        defaults = NutritionDefaults.call(birthdate: birthdate, gender: gender)
        return render_errors(I18n.t("api.errors.not_found"), status: :not_found) if defaults.nil?

        render json: { nutrition_defaults: defaults }
      end

      private

      def nutrition_basis
        if params[:birthdate].blank? && current_user
          return [ current_user.birthdate, current_user.gender ]
        end

        birthdate = Date.iso8601(params.require(:birthdate).to_s)
        gender = params[:gender].presence || "unspecified"
        return render_errors("#{User.human_attribute_name(:gender)}#{I18n.t('errors.messages.inclusion')}") unless User.genders.key?(gender)

        [ birthdate, gender ]
      rescue Date::Error
        render_errors("#{User.human_attribute_name(:birthdate)}#{I18n.t('activerecord.errors.messages.invalid_date')}")
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
