# 運動タスクの今日のチェックリスト（spec.md 2章・8章）。タスクの登録・削除は PUT /goal で行う
module Api
  module V1
    class ExerciseTasksController < BaseController
      before_action :close_overdue_timers

      # GET /api/v1/exercise_tasks/today
      def today
        date = Time.zone.today
        tasks = current_user.exercise_tasks.active.ordered
        completions = ExerciseTaskCompletion.where(exercise_task: tasks).on(date).index_by(&:exercise_task_id)
        items = tasks.map { |task| exercise_task_json(task, completions[task.id]) }
        render json: {
          date: date,
          exercise_tasks: items,
          completed_count: items.count { |item| item[:completed] },
          total_count: items.size
        }
      end
    end
  end
end
