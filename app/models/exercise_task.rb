class ExerciseTask < ApplicationRecord
  belongs_to :user
  has_many :exercise_task_completions, dependent: :destroy

  validates :title, presence: true, length: { maximum: 100 }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:position, :id) }

  # 削除は論理削除。過去の達成記録を残すため行は消さない
  def deactivate!
    update!(active: false)
  end

  def completed_on?(date)
    exercise_task_completions.exists?(target_date: date)
  end
end
