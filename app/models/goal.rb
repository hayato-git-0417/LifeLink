class Goal < ApplicationRecord
  NUTRIENT_COLUMNS = %i[calorie_goal protein_goal_g fat_goal_g carbs_goal_g fiber_goal_g].freeze
  MEAL_TIME_COLUMNS = %i[breakfast_time lunch_time dinner_time].freeze

  belongs_to :user

  enum :sleep_goal_type, { duration: 0, time_range: 1 }, validate: true

  # 食事時刻の初期値 7:00／12:00／19:00（config/game.yml）
  MEAL_TIME_COLUMNS.each do |column|
    meal = column.to_s.delete_suffix("_time").to_sym
    attribute column, default: -> { GameConfig.meal_times[meal] }
  end

  validates :user_id, uniqueness: true
  validates :sleep_goal_minutes, presence: true, numericality: { only_integer: true, greater_than: 0 }, if: :duration?
  validates :bedtime, :wake_time, presence: true, if: :time_range?
  validates :work_goal_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
  validates(*NUTRIENT_COLUMNS, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true)

  # スコア計算に使う目標睡眠時間（分）。時間帯のときは 起床 − 就寝（日をまたぐときは +24h）
  def target_sleep_minutes
    return sleep_goal_minutes if duration?
    return nil if bedtime.nil? || wake_time.nil?

    minutes = minutes_of_day(wake_time) - minutes_of_day(bedtime)
    minutes += 24 * 60 if minutes <= 0
    minutes
  end

  private

  def minutes_of_day(time)
    time.hour * 60 + time.min
  end
end
