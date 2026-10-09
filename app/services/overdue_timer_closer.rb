# 止め忘れの自動終了（spec.md 2.1）。計測中のまま上限（config/game.yml の timer）を超えた睡眠・ワークを
# 開始 + 上限 で終了扱いにする。cron は使わず、ホーム・記録 API にアクセスしたときに呼ぶ。
#   OverdueTimerCloser.call(user: current_user) # => 自動終了した記録の配列
class OverdueTimerCloser
  def self.call(user:, now: Time.current)
    closed = TimerRecorder::KINDS.values.filter_map do |klass|
      record = klass.where(user_id: user.id).in_progress.first
      next unless record

      limit_at = record.started_time + klass.max_minutes.minutes
      next if now <= limit_at

      record.update!(klass.finish_column => limit_at)
      record
    end

    DailyAchievementUpdater.call(user: user, dates: closed.map(&:recorded_on)) if closed.any?
    closed
  end
end
