# フォローする／外す（spec.md 5章・7章）。フォローしたら相手に follow 通知を作る（回数の制限なし）
module Api
  module V1
    class FollowsController < BaseController
      before_action :set_user

      # POST /api/v1/users/:id/follow（フォロー済みならそのまま成功。通知は新しくフォローしたときだけ）
      def create
        follow = current_user.active_follows.find_or_initialize_by(followed: @user)
        if follow.new_record?
          saved = Follow.transaction do
            follow.save && notify_followed(follow)
          end
          return render_errors(follow.errors.full_messages) unless saved
        end

        render json: follow_json(true), status: :ok
      end

      # DELETE /api/v1/users/:id/follow（フォローしていなくても成功）
      def destroy
        current_user.active_follows.where(followed: @user).destroy_all
        render json: follow_json(false)
      end

      private

      def set_user
        @user = User.find(params[:user_id])
      end

      def notify_followed(follow)
        @user.notifications.create!(
          notification_type: :follow,
          actor: current_user,
          notifiable: follow,
          title: I18n.t("game.notifications.follow.title", name: current_user.name),
          body: I18n.t("game.notifications.follow.body")
        )
      end

      def follow_json(following)
        { following: following, followers_count: @user.passive_follows.count }
      end
    end
  end
end
