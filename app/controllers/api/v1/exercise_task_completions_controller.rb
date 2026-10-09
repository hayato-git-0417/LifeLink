# 運動タスクの今日のチェックを付ける／外す（1タスク1日1回）。
# チェックできるのは自分の有効なタスクだけ。何度呼んでも結果は同じ（すでに付いていても 200）
module Api
  module V1
    class ExerciseTaskCompletionsController < BaseController
      game_api
      before_action :set_task

      # POST /api/v1/exercise_tasks/:id/completion
      def create
        completion = @task.exercise_task_completions.find_or_create_by!(target_date: today) do |new_completion|
          new_completion.completed_at = Time.current
        end
        refresh_daily_achievements(today)
        render json: { exercise_task: exercise_task_json(@task, completion) }
      rescue ActiveRecord::RecordNotUnique
        # 同時に2回押されたとき（もう一方が保存済み）
        render json: { exercise_task: exercise_task_json(@task, @task.exercise_task_completions.on(today).first) }
      end

      # DELETE /api/v1/exercise_tasks/:id/completion
      def destroy
        @task.exercise_task_completions.on(today).destroy_all
        refresh_daily_achievements(today)
        render json: { exercise_task: exercise_task_json(@task, nil) }
      end

      private

      def today = Time.zone.today

      def set_task
        @task = current_user.exercise_tasks.active.find(params[:exercise_task_id])
      end
    end
  end
end
