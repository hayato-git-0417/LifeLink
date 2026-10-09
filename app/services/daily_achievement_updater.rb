# 記録を保存・修正・削除した日の daily_achievements のスコアを計算し直す（spec.md 3.1・3.2）。
# キャラのポイントは動かさない。確定済みの日もスコアは直すが、増減・反映後ポイントはそのまま（spec.md 2.1【仮】）。
#   DailyAchievementUpdater.call(user: current_user, dates: [Date.new(2026, 10, 6)])
class DailyAchievementUpdater
  def self.call(user:, dates:)
    new(user: user, dates: dates).call
  end

  def initialize(user:, dates:)
    @user = user
    @dates = Array(dates).compact.uniq
  end

  # 未来の日（記録の修正でずれた場合など）は作らない
  def call
    today = Time.zone.today
    @dates.select { |date| date <= today }.map { |date| update(date) }
  end

  private

  def update(date)
    achievement = @user.daily_achievements.find_or_initialize_by(target_date: date)
    achievement.update!(ScoreCalculator.call(user: @user, date: date).to_attributes)
    achievement
  rescue ActiveRecord::RecordNotUnique
    # 同時に同じ日の行が作られたときは、作られた行を更新し直す
    retry
  end
end
