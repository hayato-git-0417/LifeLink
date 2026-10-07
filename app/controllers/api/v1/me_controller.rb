module Api
  module V1
    class MeController < BaseController
      # GET /api/v1/me
      def show
        render json: { user: user_json(current_user) }
      end

      # PATCH /api/v1/me（プロフィール変更。メール・パスワードは対象外）
      def update
        if current_user.update(profile_params)
          render json: { user: user_json(current_user) }
        else
          render_errors(current_user.errors.full_messages)
        end
      end

      private

      def profile_params
        params.require(:user).permit(:name, :icon, :birthdate, :gender)
      end

      # goal_registered: false のときフロントは目標設定画面へ誘導する（spec.md 5章）
      def user_json(user)
        {
          id: user.id,
          email: user.email,
          name: user.name,
          icon: user.icon,
          birthdate: user.birthdate,
          gender: user.gender,
          age: user.age,
          goal_registered: user.goal.present?,
          followers_count: user.passive_follows.count,
          followings_count: user.active_follows.count
        }
      end
    end
  end
end
