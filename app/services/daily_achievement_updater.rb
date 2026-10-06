# 記録を保存・修正・削除した日の daily_achievements を計算し直す（spec.md 3.1）。
# フェーズ3では呼び出し口だけ用意し、中身（ScoreCalculator を使った再計算）はフェーズ4で作る。
#   DailyAchievementUpdater.call(user: current_user, dates: [Date.new(2026, 10, 6)])
class DailyAchievementUpdater
  def self.call(user:, dates:)
    new(user: user, dates: dates).call
  end

  def initialize(user:, dates:)
    @user = user
    @dates = Array(dates).compact.uniq
  end

  # TODO(フェーズ4): @dates ごとにスコアを計算して保存する。確定済みの日もスコアは直すが、ポイントは変えない
  def call
    nil
  end
end
