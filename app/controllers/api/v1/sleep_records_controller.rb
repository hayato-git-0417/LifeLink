# 睡眠の記録。集計日は起床した日（spec.md 2.1）
module Api
  module V1
    class SleepRecordsController < TimedRecordsController
      private

      def kind = :sleep

      # 既存クライアントとの互換性のためキーだけは返す。ワークの自動終了は行わない。
      def start_json(result)
        super.merge(auto_finished_work_record: nil)
      end
    end
  end
end
