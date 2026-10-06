class ExerciseTaskCompletion < ApplicationRecord
  belongs_to :exercise_task

  validates :target_date, presence: true, uniqueness: { scope: :exercise_task_id }
  validates :completed_at, presence: true

  scope :on, ->(date) { where(target_date: date) }
end
