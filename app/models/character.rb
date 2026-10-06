class Character < ApplicationRecord
  # characters / character_state_logs / character_animations で共通の状態（spec.md 4章）
  STATES = { normal: 0, sleeping: 1, sleep_deprived: 2, full: 3, hungry: 4, exercising: 5, studying: 6, fat: 7 }.freeze
  POINT_COLUMNS = %i[sleep_points meal_points exercise_points work_points total_points].freeze

  belongs_to :user
  has_many :character_state_logs, dependent: :destroy

  enum :state, STATES, validate: true

  attribute :name, default: -> { GameConfig.character[:default_name] }
  POINT_COLUMNS.each do |column|
    attribute column, default: -> { GameConfig.points[:initial] }
  end

  validates :user_id, uniqueness: true
  validates :name, length: { maximum: 30 }
  validates(*POINT_COLUMNS, numericality: {
    only_integer: true,
    greater_than_or_equal_to: ->(_) { GameConfig.points[:min] },
    less_than_or_equal_to: ->(_) { GameConfig.points[:max] }
  })

  # 状態に対応する画像（外部キーではなく state の値で探す）
  def animation
    CharacterAnimation.find_by(state: state)
  end
end
