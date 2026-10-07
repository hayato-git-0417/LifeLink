# 睡眠・ワークの記録 API の共通部分（spec.md 2.1・8章）。手動での新規作成はない。
#   POST   start / finish / cancel  … ホームのボタン
#   GET    index（from, to）/ PATCH update / DELETE destroy … 詳細画面
# 子クラスで kind（:sleep / :work）と、修正で受け取る追加の項目を決める。
module Api
  module V1
    class TimedRecordsController < BaseController
      game_api

      # GET /api/v1/<records>?from=&to=（新しい順。計測中の記録も含む）
      def index
        range = date_range_param
        records = scope.between(range.first, range.last).order(record_class.start_column => :desc)
        render json: { json_key.pluralize => records.map { |record| record_json(record) } }
      end

      # POST /api/v1/<records>/start
      def start
        result = recorder.start(attributes: start_attributes)
        return render_errors(result.errors) unless result.success?

        render json: start_json(result), status: :created
      end

      # POST /api/v1/<records>/finish
      def finish
        render_result(recorder.finish)
      end

      # POST /api/v1/<records>/cancel（計測中の記録を削除する）
      def cancel
        result = recorder.cancel
        return render_errors(result.errors) unless result.success?

        head :no_content
      end

      # PATCH /api/v1/<records>/:id { "<record>": { "<開始>": "...", "<終了>": "..." } }
      def update
        record = scope.find(params[:id])
        input = params.require(json_key)
        render_result(recorder.update(
          record,
          started: time_param(record_class.start_column, input, required: true),
          finished: time_param(record_class.finish_column, input, required: true),
          attributes: input.permit(*extra_attributes).to_h
        ))
      end

      # DELETE /api/v1/<records>/:id
      def destroy
        recorder.destroy(scope.find(params[:id]))
        head :no_content
      end

      private

      def kind = raise(NotImplementedError)
      def extra_attributes = []
      def start_attributes = {}

      def record_class = TimerRecorder::KINDS.fetch(kind)
      def json_key = record_class.model_name.singular
      def scope = current_user.public_send(record_class.model_name.plural)
      def recorder = TimerRecorder.new(user: current_user, kind: kind)

      def render_result(result)
        return render_errors(result.errors) unless result.success?

        render json: { json_key => record_json(result.record) }
      end

      def start_json(result)
        { json_key => record_json(result.record) }
      end

      def record_json(record)
        timed_record_json(record, extra_attributes)
      end
    end
  end
end
