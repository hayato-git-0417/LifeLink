# 記録したときの進化ポイント（spec.md 4.3）。その日・その項目の1回目だけ 100 × 継続倍率 を加算する（達成度は見ない）。
# 日付は記録の操作をした時刻（ユーザーの日付）で決める。記録の修正・削除では呼ばない（入ったポイントは取り消さない）。
# 休んだ日の減少を先に済ませてから、同じロックの中で継続日数を数えて加算する。進化したら通知する。
#   EvolutionPointAwarder.call(user: current_user, item: :meal) # => 加算した履歴（EvolutionPointLog）か nil（今日はもう加算済み）
class EvolutionPointAwarder
  def self.call(user:, item:, now: Time.current)
    item = item.to_sym
    raise ArgumentError, "unknown item: #{item}" unless ScoreCalculator::ITEMS.include?(item)

    character = user.character
    return nil if character.nil?

    today = user.local_date(now)
    character.with_lock { new(character: character, item: item, today: today).call }
  rescue ActiveRecord::RecordNotUnique
    nil # 同じ日・同じ項目がほかのリクエストで加算済み（一意の索引）
  end

  # キャラの行をロックした状態で呼ぶ
  def initialize(character:, item:, today:)
    @character = character
    @item = item
    @today = today
  end

  def call
    EvolutionDecayProcessor.new(character: @character, today: @today).call
    return nil if @character.evolution_point_logs.recorded.exists?(target_date: @today, item: @item)

    streak = EvolutionRules.streak_after_record(
      last_recorded_on: @character.last_recorded_on, streak_days: @character.streak_days, date: @today
    )
    gained = EvolutionRules.record_points(streak)
    stage_before = @character.evolution_stage
    change = EvolutionRules.apply_gain(points: @character.evolution_points, stage: stage_before, gained: gained)
    @character.update!(evolution_points: change.points, evolution_stage: change.stage, streak_days: streak, last_recorded_on: @today)

    log = @character.evolution_point_logs.create!(
      reason: :recorded, item: @item, target_date: @today, multiplier_tenths: EvolutionRules.multiplier_tenths(streak),
      amount: gained, points_after: change.points, stage_after: change.stage
    )
    EvolutionNotifier.call(character: @character, log: log, stage_before: stage_before)
    log
  end
end
