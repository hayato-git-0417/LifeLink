# ホーム（spec.md 3.4・4章・8章）。
# 止め忘れの自動終了 → 前日までの確定 → 今日の達成度 → 状態判定 → 通知 の順に処理してから返す
module Api
  module V1
    class HomesController < BaseController
      game_api

      # GET /api/v1/home
      def show
        today = Time.zone.today
        achievement = DailyAchievementUpdater.call(user: current_user, dates: [ today ]).first
        resolved = CharacterStateResolver.call(user: current_user)
        HomeNotifier.call(user: current_user, resolved: resolved)

        render json: {
          character: character_json(current_user.character.reload),
          today: today_json(today, achievement),
          timers: timers_json,
          message: resolved.message,
          unread_notifications_count: current_user.notifications.unread.count,
          goal_registered: current_user.goal.present?
        }
      end

      private

      def character_json(character)
        {
          name: character.name,
          state: character.state,
          state_label: character.state_label,
          image_path: character.image_path,
          mood: character.mood,
          points: ScoreCalculator::ITEMS.index_with { |item| character[:"#{item}_points"] }
                                        .merge(total: character.total_points)
        }
      end

      # スコアは保存した値（ワークは 100 を超えることがある。ゲージは 100 で頭打ちにして表示する）
      def today_json(today, achievement)
        scores = ScoreCalculator::ITEMS.index_with { |item| achievement[:"#{item}_score"] }
        {
          date: today,
          scores: scores.transform_values(&:to_f),
          total_percent: ScoreCalculator.total_percent(scores).to_f,
          recorded_items_count: achievement.recorded_items_count
        }
      end

      # 計測中のタイマー（ボタンの表示と経過時間に使う）
      def timers_json
        sleep = current_user.sleep_records.in_progress.first
        work = current_user.work_records.in_progress.first
        {
          sleep: sleep && { id: sleep.id, slept_at: sleep.slept_at },
          work: work && { id: work.id, title: work.title, started_at: work.started_at }
        }
      end
    end
  end
end
