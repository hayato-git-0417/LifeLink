class MealTypeClassifier
  TYPES = %w[breakfast lunch dinner].freeze

  def self.call(user:, eaten_at:)
    return "snack" unless eaten_at

    time = eaten_at.in_time_zone
    minutes = time.hour * 60 + time.min
    goal = user.goal
    candidates = TYPES.map do |type|
      target = goal&.public_send("#{type}_time")
      hour, minute = target ? [target.hour, target.min] : GameConfig.meal_times.fetch(type.to_sym).split(":").map(&:to_i)
      distance = (minutes - (hour * 60 + minute)).abs
      [type, [distance, 1440 - distance].min]
    end
    type, distance = candidates.min_by(&:last)
    distance <= GameConfig.meal_classification[:window_minutes] ? type : "snack"
  end
end
