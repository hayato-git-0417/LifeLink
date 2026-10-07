# 日ごとのスコアとポイントの推移（詳細画面のグラフ。spec.md 5章・8章）
module Api
  module V1
    class DailyAchievementsController < BaseController
      game_api

      # GET /api/v1/daily_achievements?from=&to=（省略時は今日までの7日。日付の古い順）
      #   記録のない日は行がないことがある（確定した日は必ずある）。
      #   ポイント（*_change / *_points / total_points）は確定した日だけ。確定前（今日など）は null
      def index
        range = date_range_param
        rows = current_user.daily_achievements.between(range.first, range.last).order(:target_date)
        render json: {
          daily_achievements: rows.map { |row| daily_achievement_json(row) },
          current_points: current_points_json(current_user.character)
        }
      end
    end
  end
end
