# ログインが必要な API の親。他人のデータは必ず current_user 経由で取る（CLAUDE.md）
module Api
  module V1
    class BaseController < ApplicationController
      # 一覧（from, to）の既定は今日までの7日、最大は1年分
      DEFAULT_RANGE_DAYS = 7
      MAX_RANGE_DAYS = 366

      before_action :authenticate_user!

      # 入力が正しくないときは、メッセージを付けて 422 を返すために使う
      class InvalidParam < StandardError; end

      rescue_from InvalidParam do |e|
        render_errors(e.message)
      end

      # 記録・ホームの API で使う。
      #   前: 止め忘れの自動終了（spec.md 2.1）→ 前日までの確定（spec.md 3.2）
      #   後: 記録を変えたらキャラの状態を判定し直す（spec.md 4.1「記録の保存時」）
      def self.game_api
        before_action :prepare_game_state
        after_action :resolve_character_state, unless: -> { request.get? || response.status >= 400 }
      end

      private

      def prepare_game_state
        OverdueTimerCloser.call(user: current_user)
        DailyFinalizer.call(user: current_user)
      end

      def resolve_character_state
        CharacterStateResolver.call(user: current_user)
      end

      # 記録が変わった日の達成度を計算し直す（中身はフェーズ4）
      def refresh_daily_achievements(*dates)
        DailyAchievementUpdater.call(user: current_user, dates: dates.flatten)
      end

      # ?from=2026-10-01&to=2026-10-07 → Range。省略時は今日までの7日
      def date_range_param
        to = date_param(:to) || Time.zone.today
        from = date_param(:from) || to - (DEFAULT_RANGE_DAYS - 1)
        raise InvalidParam, I18n.t("api.errors.date_range_order") if from > to
        raise InvalidParam, I18n.t("api.errors.date_range_too_long", days: MAX_RANGE_DAYS) if (to - from).to_i >= MAX_RANGE_DAYS

        from..to
      end

      def date_param(key, source = params)
        value = source[key]
        return nil if value.blank?

        Date.iso8601(value.to_s)
      rescue Date::Error
        raise InvalidParam, I18n.t("api.errors.invalid_date_param", param: key)
      end

      # ISO 8601 の日時（"2026-10-06T07:00:00+09:00"）。タイムゾーンがなければ日本時間とみなす
      def time_param(key, source = params, required: false)
        value = source[key]
        if value.blank?
          raise ActionController::ParameterMissing, key if required

          return nil
        end

        Time.zone.iso8601(value.to_s)
      rescue ArgumentError
        raise InvalidParam, I18n.t("api.errors.invalid_time_param", param: key)
      end

      # 運動タスクと今日の達成状況（completion は ExerciseTaskCompletion か nil）
      def exercise_task_json(task, completion)
        {
          id: task.id,
          title: task.title,
          position: task.position,
          completed: completion.present?,
          completed_at: completion&.completed_at
        }
      end

      # DECIMAL は JSON で文字列になるので数値に直す
      def numeric_json(hash)
        hash.transform_values { |value| value.is_a?(BigDecimal) ? value.to_f : value }
      end
    end
  end
end
