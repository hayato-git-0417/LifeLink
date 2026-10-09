# ワークの記録。集計日は開始した日（spec.md 2.1）。睡眠中は開始できない
module Api
  module V1
    class WorkRecordsController < TimedRecordsController
      private

      def kind = :work
      def extra_attributes = %i[title]

      # 開始時に内容（任意）を付けられる: { "work_record": { "title": "卒研" } }
      def start_attributes
        params.fetch(:work_record, {}).permit(:title).to_h
      end
    end
  end
end
