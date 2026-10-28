# 運動時間と移動距離の記録 API。
module Api
  module V1
    class ExerciseRecordsController < BaseController
      game_api

      # GET /api/v1/exercise_records?from=&to=
      def index
        range = date_range_param
        records = current_user.exercise_records.between(range.first, range.last).order(:started_at).to_a
        manual_records = records.select(&:manual?)
        timer_records = records.select(&:timer?)
        distance_totals = manual_records.group_by(&:recorded_on).transform_values { |list| list.sum { |record| record.distance_km.to_f } }
        timer_by_date = timer_records.group_by(&:recorded_on)

        render json: {
          exercise_records: records.map { |record| record_json(record) },
          daily_duration_totals: range.map do |date|
            activities = Array(timer_by_date[date]).group_by { |record| record.memo.presence || "運動" }
            {
              date: date,
              duration_minutes: activities.values.sum { |list| list.sum(&:duration_minutes) },
              activities: activities.map { |title, list| { title: title, duration_minutes: list.sum(&:duration_minutes) } }
            }
          end
        }
      end

      # POST /api/v1/exercise_records: timer duration or manual distance
      def create
        if params[:exercise_records].present?
          records = params[:exercise_records].map do |attributes|
            input = attributes.permit(:duration_minutes, :memo)
            current_user.exercise_records.build(
              duration_minutes: input[:duration_minutes],
              memo: input[:memo],
              started_at: Time.current,
              ended_at: Time.current,
              record_method: :timer
            )
          end
          return render_errors(records.flat_map { |record| record.valid? ? [] : record.errors.full_messages }.uniq) unless records.all?(&:valid?)

          ExerciseRecord.transaction { records.each(&:save!) }
          refresh_daily_achievements(records.first.recorded_on) if records.any?
          return render json: { exercise_records: records.map { |record| record_json(record) } }, status: :created
        end

        input = params.require(:exercise_record)
        if input[:record_method] == "timer"
          record = current_user.exercise_records.build(
            duration_minutes: input[:duration_minutes],
            memo: input[:memo],
            started_at: Time.current,
            ended_at: Time.current,
            record_method: :timer
          )
        else
           record = current_user.exercise_records.build(
            distance_km: input[:distance_km],
            memo: input[:memo],
            started_at: Time.current,
            record_method: :manual
          )
        end
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
        numeric_json(record.slice(:id, :started_at, :ended_at, :duration_minutes, :record_method, :distance_km, :memo, :recorded_on))
      end
    end
  end
end

# # 運動の記録 = 移動距離の手入力（spec.md 2章）。運動タイマーはないので作成・一覧・削除だけ
# module Api
#   module V1
#     class ExerciseRecordsController < BaseController
#       game_api

#       # GET /api/v1/exercise_records?from=&to=（7日グラフ用に日ごとの合計も返す）
#       def index
#         range = date_range_param
#         records = current_user.exercise_records.between(range.first, range.last).order(:started_at).to_a
#         totals = records.group_by(&:recorded_on).transform_values { |list| list.sum(&:distance_km) }
#         render json: {
#           exercise_records: records.map { |record| record_json(record) },
#           daily_totals: range.map { |date| { date: date, distance_km: totals.fetch(date, 0).to_f } }
#         }
#       end

#       # POST /api/v1/exercise_records { "exercise_record": { "distance_km": 2.5, "memo": "ジョギング" } }
#       # 記録日時は入力した日時（started_at）。集計日はその日
#       def create
#         record = current_user.exercise_records.build(
#           params.require(:exercise_record).permit(:distance_km, :memo).merge(started_at: Time.current, record_method: :manual)
#         )
#         return render_errors(record.errors.full_messages) unless record.save

#         refresh_daily_achievements(record.recorded_on)
#         render json: { exercise_record: record_json(record) }, status: :created
#       end

#       # DELETE /api/v1/exercise_records/:id
#       def destroy
#         record = current_user.exercise_records.find(params[:id])
#         record.destroy!
#         refresh_daily_achievements(record.recorded_on)
#         head :no_content
#       end

#       private

#       def record_json(record)
#         numeric_json(record.slice(:id, :started_at, :distance_km, :memo, :recorded_on))
#       end
#     end
#   end
# end
