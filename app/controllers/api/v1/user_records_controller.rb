# 相互フォローの人の記録の詳細（読み取り専用。チームの要望 2026-10-07）。
# 自分の詳細画面と同じ内容（スコアとポイントの推移・就寝と起床の時刻・ワークの内容・日ごとの栄養の合計・移動距離）を返す。
# 食事の内容・コメント・写真、移動距離のメモは返さない。
# 相手の止め忘れの自動終了・日次確定はしない（見るだけで相手のデータを変えない）。
module Api
  module V1
    class UserRecordsController < BaseController
      TABS = %w[sleep meal exercise work].freeze

      # GET /api/v1/users/:user_id/records?tab=sleep&from=&to=
      # 相互フォローでない人・自分・存在しない人は 404（自分の分は各記録の API を使う）
      def show
        user = User.find(params[:user_id])
        raise ActiveRecord::RecordNotFound unless current_user.mutual_follow?(user)

        tab = params[:tab].presence || TABS.first
        raise InvalidParam, I18n.t("api.errors.invalid_tab", tabs: TABS.join(" / ")) unless TABS.include?(tab)

        range = date_range_param
        rows = user.daily_achievements.between(range.first, range.last).order(:target_date)
        render json: {
          daily_achievements: rows.map { |row| daily_achievement_json(row) },
          current_points: current_points_json(user.character)
        }.merge(send(:"#{tab}_json", user, range))
      end

      private

      def sleep_json(user, range)
        records = user.sleep_records.between(range.first, range.last).order(slept_at: :desc)
        { sleep_records: records.map { |record| timed_record_json(record) } }
      end

      def work_json(user, range)
        records = user.work_records.between(range.first, range.last).order(started_at: :desc)
        { work_records: records.map { |record| timed_record_json(record, %i[title]) } }
      end

      # 食事は1食ごとの集計日と栄養値だけ（画面で日ごとに合計する）
      def meal_json(user, range)
        meals = user.meals.between(range.first, range.last).order(:eaten_at)
        { meals: meals.map { |meal| numeric_json(meal.slice(:recorded_on, *Meal::NUTRIENT_COLUMNS)) } }
      end

      def exercise_json(user, range)
        totals = user.exercise_records.between(range.first, range.last).group(:recorded_on).sum(:distance_km)
        { daily_totals: range.map { |date| { date: date, distance_km: totals.fetch(date, 0).to_f } } }
      end
    end
  end
end
