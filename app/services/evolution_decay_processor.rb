# 記録しなかった日の減少（spec.md 4.3）。ログインが必要な API へのアクセスのたびに呼ぶ（その日の2回目以降はロックも取らずに戻る）。
# 前回記録した日の翌日〜昨日のうち、まだ処理していない「休んだ日」1日につき −200 し、継続日数を 0 に戻す。
# 今日はまだ記録できるので数えない。どの日まで処理したか（decay_processed_through）を保存し、同じ休みに二重に減らさない。
# 計算は EvolutionRules（下限: 段階1以上は 300、段階0は 0）。退化したら通知する。
#   EvolutionDecayProcessor.call(user: current_user) # => 減らした履歴（EvolutionPointLog）か nil
class EvolutionDecayProcessor
  def self.call(user:, now: Time.current)
    character = user.character
    return nil if character.nil?

    today = user.local_date(now)
    return nil unless due?(character, today)

    # ロックを取ると読み直すので、同時に呼ばれても後のほうは処理済みとして戻る
    character.with_lock { new(character: character, today: today).call }
  end

  # 昨日までの処理が済んでいなければ true
  def self.due?(character, today)
    character.decay_processed_through.nil? || character.decay_processed_through < today - 1
  end

  # キャラの行をロックした状態で呼ぶ（EvolutionPointAwarder からも、加算の前に呼ぶ）
  def initialize(character:, today:)
    @character = character
    @today = today
  end

  def call
    return nil unless self.class.due?(@character, @today)

    days = missed_days
    @character.decay_processed_through = @today - 1
    if days.zero?
      @character.save!
      return nil
    end

    points_before = @character.evolution_points
    stage_before = @character.evolution_stage
    change = EvolutionRules.apply_decay(points: points_before, stage: stage_before, missed_days: days)
    @character.update!(evolution_points: change.points, evolution_stage: change.stage, streak_days: 0)

    # 下限で止まったときは、実際に減った分を残す
    log = @character.evolution_point_logs.create!(
      reason: :missed, target_date: @today, missed_days: days,
      amount: change.points - points_before, points_after: change.points, stage_after: change.stage
    )
    EvolutionNotifier.call(character: @character, log: log, stage_before: stage_before)
    log
  end

  private

  # 機能を入れる前からいるユーザー（処理済みの日がまだない）は、さかのぼって減らさない
  def missed_days
    return 0 if @character.decay_processed_through.nil?

    EvolutionRules.missed_days(
      last_recorded_on: @character.last_recorded_on,
      processed_through: @character.decay_processed_through,
      today: @today
    )
  end
end
