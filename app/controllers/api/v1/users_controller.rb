
# ユーザー検索・他人のマイページ・フォロー一覧（spec.md 5章・8章）。
# 他人について返すのは アイコン・名前・フォロー数・キャラの状態・総合ポイントだけ（睡眠時刻や食事内容は返さない）。
# 相互フォロー（mutual）の人の記録の詳細は UserRecordsController
module Api
  module V1
    class UsersController < BaseController
      SEARCH_LIMIT = 20

      # GET /api/v1/users?q=名前の一部（自分は除く。q が空なら空の一覧）
      def index
        query = params[:q].to_s.strip
        return render json: { users: [] } if query.empty?

        escaped_query = User.sanitize_sql_like(query)

        users = User.where(
          "name LIKE :query OR LOWER(account_id) LIKE :account_query",
          query: "%#{escaped_query}%",
          account_query: "%#{escaped_query.downcase}%"
        )
        .where.not(id: current_user.id)
        .order(:name, :id)
        .limit(SEARCH_LIMIT)
        .with_attached_avatar

        render json: { users: user_list_json(users.to_a) }
      end

      # GET /api/v1/users/:id（他人のプロフィール）
      def show
        user = User.includes(:character, avatar_attachment: :blob).find(params[:id])

        render json: { user: public_profile_json(user) }
      end

      # GET /api/v1/users/:id/followers（自分のフォロワー一覧）
      def followers
        user = own_user!

        render json: {
          users: user_list_json(
            user.followers.order("follows.created_at DESC")
                .with_attached_avatar.to_a
          )
        }
      end

      # GET /api/v1/users/:id/followings（自分のフォロー一覧）
      def followings
        user = own_user!

        render json: {
          users: user_list_json(
            user.followings.order("follows.created_at DESC")
                .with_attached_avatar.to_a
          )
        }
      end

      private

      # 自分のフォロー一覧だけ閲覧可能
      def own_user!
        raise ActiveRecord::RecordNotFound unless params[:id].to_s == current_user.id.to_s

        current_user
      end

      # ユーザー一覧の1行
      # following は「自分がその人をフォローしているか」
      def user_list_json(users)
        following_ids = current_user.active_follows
                                    .where(followed_id: users.map(&:id))
                                    .pluck(:followed_id)
                                    .to_set

        users.map do |user|
          {
            id: user.id,
            account_id: user.account_id,
            name: user.name,
            icon: user.icon,
            avatar_url: user.avatar.attached? ? rails_blob_path(user.avatar, only_path: true) : nil,
            avatar_selected: user.avatar_selected,
            following: following_ids.include?(user.id)
          }
        end
      end

      # 他人のプロフィールで公開する情報
      # キャラの状態・ポイントは保存されている値
      def public_profile_json(user)
        character = user.character

        {
          id: user.id,
          name: user.name,
          icon: user.icon,
          followers_count: user.passive_follows.count,
          followings_count: user.active_follows.count,
          character: character && {
            state: character.state,
            state_label: character.state_label,
            image_path: character.image_path,
            mood: character.mood,
            total_points: character.total_points
          }
        }
      end
    end
  end
end
