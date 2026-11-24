module Api
  module V1
    class MeController < BaseController
      # GET /api/v1/me
      def show
        render json: { user: user_json(current_user) }
      end

      # PATCH /api/v1/me（プロフィール変更。メール・パスワードは対象外）
      def update
        attributes = profile_params
        remove_avatar = ActiveModel::Type::Boolean.new.cast(attributes.delete(:remove_avatar))
        if current_user.update(attributes)
          current_user.avatar.purge if remove_avatar && !attributes.key?(:avatar)
          render json: { user: user_json(current_user) }
        else
          render_errors(current_user.errors.full_messages)
        end
      end

      private

      def profile_params
        params.require(:user).permit(:account_id, :name, :icon, :birthdate, :gender, :height_cm, :weight_kg, :activity_level, :avatar, :avatar_selected, :remove_avatar)
      end

      # goal_registered: false のときフロントは目標設定画面へ誘導する（spec.md 5章）
      def user_json(user)
        {
          id: user.id,
          account_id: user.account_id,
          name: user.name,
          icon: user.icon,
          avatar_url: user.avatar.attached? ? rails_blob_path(user.avatar, only_path: true) : nil,
          avatar_selected: user.avatar_selected,
          birthdate: user.birthdate,
          gender: user.gender,
          height_cm: user.height_cm&.to_f,
          weight_kg: user.weight_kg&.to_f,
          activity_level: user.activity_level,
          age: user.age,
          goal_registered: user.goal.present?,
          followers_count: user.passive_follows.count,
          followings_count: user.active_follows.count
        }
      end
    end
  end
end
