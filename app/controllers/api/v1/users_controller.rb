# ユーザー検索・他人のマイページ・フォロー一覧（spec.md 5章・8章）。
# 他人について返すのは アイコン・名前・フォロー数・キャラの状態・総合ポイントだけ（睡眠時刻や食事内容は返さない）
module Api
  module V1
    class UsersController < BaseController
      SEARCH_LIMIT = 20

      # GET /api/v1/users?q=名前の一部（自分は除く。q が空なら空の一覧）
      def index
        query = params[:q].to_s.strip
        return render json: { users: [] } if query.empty?

        users = User.where("name LIKE ?", "%#{User.sanitize_sql_like(query)}%")
                    .where.not(id: current_user.id)
                    .order(:name, :id)
                    .limit(SEARCH_LIMIT)
        render json: { users: user_list_json(users.to_a) }
      end

      # GET /api/v1/users/:id（ユーザーのプロフィールは公開情報なので User から探す）
      def show
        user = User.includes(:character).find(params[:id])
        render json: { user: public_profile_json(user) }
      end

      # GET /api/v1/users/:id/followers・followings（見られるのは自分の一覧だけ【仮】）
      def followers
        render json: { users: user_list_json(own_user!.followers.order("follows.created_at DESC").to_a) }
      end

      def followings
        render json: { users: user_list_json(own_user!.followings.order("follows.created_at DESC").to_a) }
      end

      private

      def own_user!
        raise ActiveRecord::RecordNotFound unless params[:id].to_s == current_user.id.to_s

        current_user
      end

      # 一覧の1行。following は「自分がその人をフォローしているか」
      def user_list_json(users)
        following_ids = current_user.active_follows.where(followed_id: users.map(&:id)).pluck(:followed_id).to_set
        users.map do |user|
          { id: user.id, name: user.name, icon: user.icon, following: following_ids.include?(user.id) }
        end
      end

      # キャラの状態・ポイントは保存されている値（その人が最後にアクセスした時点のもの）
      def public_profile_json(user)
        character = user.character
        {
          id: user.id,
          name: user.name,
          icon: user.icon,
          is_self: user.id == current_user.id,
          following: current_user.following?(user),
          followers_count: user.passive_follows.count,
          followings_count: user.active_follows.count,
          character: character && {
            name: character.name,
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
