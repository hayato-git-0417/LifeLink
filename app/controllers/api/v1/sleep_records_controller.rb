# 睡眠の記録。集計日は起床した日（spec.md 2.1）
module Api
  module V1
    class SleepRecordsController < TimedRecordsController
      private

      def kind = :sleep

      # 就寝時に計測中だったワークは自動終了し、レスポンスで知らせる
      def start_json(result)
        super.merge(auto_finished_work_record: result.auto_finished&.then { |work| work_json(work) })
      end

      def work_json(work)
        work.as_json(only: %i[id title started_at ended_at duration_minutes recorded_on record_method]).merge("in_progress" => false)
      end
    end
  end
end
