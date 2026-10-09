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
          daily_achievements: rows.map { |row| achievement_json(row) },
          current_points: ScoreCalculator::ITEMS.index_with { |item| current_user.character[:"#{item}_points"] }
                                                .merge(total: current_user.character.total_points)
        }
      end

      private

      def achievement_json(row)
        scores = ScoreCalculator::ITEMS.index_with { |item| row[:"#{item}_score"] }
        finalized = row.finalized?
        json = {
          target_date: row.target_date,
          total_percent: ScoreCalculator.total_percent(scores).to_f,
          recorded_items_count: row.recorded_items_count,
          finalized: finalized,
          total_points: finalized ? row.total_points : nil
        }
        ScoreCalculator::ITEMS.each do |item|
          json[:"#{item}_score"] = scores[item].to_f
          json[:"#{item}_change"] = finalized ? row[:"#{item}_change"] : nil
          json[:"#{item}_points"] = finalized ? row[:"#{item}_points"] : nil
        end
        json
      end
    end
  end
end
