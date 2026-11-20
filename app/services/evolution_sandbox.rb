# 進化の動きを確かめる開発用の操作（ホームの「進化テスト」パネル。API は development・test だけ）。
# 記録そのもの（食事・睡眠など）は作らず、進化のポイント・継続日数・休んだ日だけを本物の処理で動かす。
# 「日を進める」は、日付を持つ値（最後に記録した日・減少を済ませた日・増減履歴の対象日）を過去へずらして、時間がたったことにする。
#   sandbox = EvolutionSandbox.new(user: current_user)
#   sandbox.record(:meal)                 # 今日、食事を記録したことにする
#   sandbox.advance(3)                    # 3日たったことにする（その間は記録なし）→ 休んだ日の減少
#   sandbox.simulate(days: 30, items: 4)  # 30日間毎日4項目を記録して、その翌日にする
class EvolutionSandbox
  MAX_DAYS = 365
  MAX_POINTS = 10_000_000
  MAX_STREAK = 1_000

  Snapshot = Data.define(:points, :stage)

  def initialize(user:, now: Time.current)
    @user = user
    @character = user.character
    @now = now
  end

  def today
    @user.local_date(@now)
  end

  # 今日、その項目を記録したことにする（本物の記録と同じ加算。今日2回目は nil）
  def record(item)
    EvolutionPointAwarder.call(user: @user, item: item, now: @now)
  end

  # days 日たったことにして（その間は記録なし）、ログインしたときの減少をする。減らした履歴か nil を返す
  def advance(days)
    shift_back(days)
    EvolutionDecayProcessor.call(user: @user, now: @now)
  end

  # 今日から days 日間、毎日 items 個の項目を記録して、最後の日の翌日になったことにする。前後の [ポイント, 段階] を返す
  def simulate(days:, items:)
    before = snapshot
    ApplicationRecord.transaction do
      days.times do |offset|
        ScoreCalculator::ITEMS.first(items).each do |item|
          EvolutionPointAwarder.call(user: @user, item: item, now: @now + offset.days)
        end
      end
      shift_back(days)
    end
    [ before, snapshot ]
  end

  # 累計ポイントを直接決める（段階はポイントから決める。履歴・通知は作らない）
  def set_points(points)
    @character.with_lock do
      @character.update!(evolution_points: points, evolution_stage: EvolutionRules.stage_for(points))
    end
  end

  # 昨日まで days 日続いていることにする（0 なら途切れたことにする）
  def set_streak(days)
    @character.with_lock do
      if days.zero?
        @character.update!(streak_days: 0)
      else
        @character.update!(streak_days: days, last_recorded_on: today - 1, decay_processed_through: today - 1)
      end
    end
  end

  # 進化を最初の状態に戻す（今日登録したのと同じ）。進化の履歴と通知も消す
  def reset
    @character.with_lock do
      @user.notifications.evolution.delete_all
      @character.evolution_point_logs.delete_all
      @character.update!(evolution_points: 0, evolution_stage: 0, streak_days: 0, last_recorded_on: nil, decay_processed_through: today)
    end
  end

  private

  def snapshot
    @character.reload
    Snapshot.new(points: @character.evolution_points, stage: @character.evolution_stage)
  end

  def shift_back(days)
    @character.with_lock do
      @character.update!(
        last_recorded_on: @character.last_recorded_on && @character.last_recorded_on - days,
        decay_processed_through: @character.decay_processed_through && @character.decay_processed_through - days
      )
      # 日付の早い行から動かす（一意の索引「キャラ・日・項目」が途中でぶつからないように）
      @character.evolution_point_logs.order(:target_date)
                .update_all([ "target_date = DATE_SUB(target_date, INTERVAL ? DAY)", days ])
    end
  end
end
