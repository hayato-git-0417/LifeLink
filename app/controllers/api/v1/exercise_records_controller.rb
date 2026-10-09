# 運動の記録 = 移動距離の手入力（spec.md 2章）。運動タイマーはないので作成・一覧・削除だけ
module Api
  module V1
    class ExerciseRecordsController < BaseController
      game_api

      # GET /api/v1/exercise_records?from=&to=（7日グラフ用に日ごとの合計も返す）
      def index
        range = date_range_param
        records = current_user.exercise_records.between(range.first, range.last).order(:started_at).to_a
        totals = records.group_by(&:recorded_on).transform_values { |list| list.sum(&:distance_km) }
        render json: {
          exercise_records: records.map { |record| record_json(record) },
          daily_totals: range.map { |date| { date: date, distance_km: totals.fetch(date, 0).to_f } }
        }
      end

      # POST /api/v1/exercise_records { "exercise_record": { "distance_km": 2.5, "memo": "ジョギング" } }
      # 記録日時は入力した日時（started_at）。集計日はその日
      def create
        record = current_user.exercise_records.build(
          params.require(:exercise_record).permit(:distance_km, :memo).merge(started_at: Time.current, record_method: :manual)
        )
        return render_errors(record.errors.full_messages) unless record.save

        refresh_daily_achievements(record.recorded_on)
        render json: { exercise_record: record_json(record) }, status: :created
      end

      # DELETE /api/v1/exercise_records/:id
      def destroy
        record = current_user.exercise_records.find(params[:id])
        record.destroy!
        refresh_daily_achievements(record.recorded_on)
        head :no_content
      end

      private

      def record_json(record)
        numeric_json(record.slice(:id, :started_at, :distance_km, :memo, :recorded_on))
      end
    end
  end
end
