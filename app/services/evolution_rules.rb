# キャラの進化の計算（spec.md 4.3）。DB・画面・時計に依存しない純粋な関数だけを置く。
# 日付は呼び出し側が「そのユーザーの今日」を渡す。定数は config/game.yml の evolution（引数 config で差し替え可）。
#   EvolutionRules.record_points(3)                       # => 130（継続3日目 = 1.3倍）
#   EvolutionRules.stage_for(3_000)                       # => 2
#   EvolutionRules.apply_decay(points: 3_200, stage: 2, missed_days: 2) # => #<Change points=2800, stage=1>
# 倍率は 10 分の 1 単位の整数で扱い、浮動小数点を使わない（100 × 1.1 を 100 × 11 ÷ 10 で計算する）。
module EvolutionRules
  # 計算後のポイントと段階
  Change = Data.define(:points, :stage)

  module_function

  def default_config
    GameConfig.evolution
  end

  def thresholds(config = default_config)
    config[:stage_thresholds]
  end

  def max_stage(config: default_config)
    thresholds(config).size - 1
  end

  # 倍率（10 分の 1 単位）。継続日数は当日を含む（1日目 = 11 = 1.1倍、90日目以降 = 100 = 10倍）
  def multiplier_tenths(streak_days, config: default_config)
    multiplier = config[:multiplier]
    [ multiplier[:base_tenths] + multiplier[:step_tenths] * streak_days, multiplier[:max_tenths] ].min
  end

  # 1項目を記録したときに入るポイント = 記録ポイント × 倍率（切り捨て）
  def record_points(streak_days, config: default_config)
    config[:points_per_record] * multiplier_tenths(streak_days, config: config) / 10
  end

  # 今日（date）記録したあとの継続日数。
  # 今日すでに記録済みならそのまま、前回が昨日なら +1、それより前（または初めて）なら 1 からやり直す
  def streak_after_record(last_recorded_on:, streak_days:, date:)
    return [ streak_days, 1 ].max if last_recorded_on && last_recorded_on >= date
    return streak_days + 1 if last_recorded_on == date - 1

    1
  end

  # 画面に出す継続日数。前回の記録が昨日か今日なら続いている、それより前なら 0
  def current_streak(last_recorded_on:, streak_days:, today:)
    last_recorded_on && last_recorded_on >= today - 1 ? streak_days : 0
  end

  # 今日記録したときにかかる倍率（10 分の 1 単位）。ホームの「今日の倍率」
  def today_multiplier_tenths(last_recorded_on:, streak_days:, today:, config: default_config)
    streak = streak_after_record(last_recorded_on: last_recorded_on, streak_days: streak_days, date: today)
    multiplier_tenths(streak, config: config)
  end

  # 累計ポイントで到達している一番上の段階
  def stage_for(points, config: default_config)
    thresholds(config).rindex { |threshold| points >= threshold } || 0
  end

  # ポイントの下限。一度でも min_stage_once_reached（段階1）に達していればその段階のライン（300）、まだなら 0
  def floor_points(stage, config: default_config)
    min_stage = config[:min_stage_once_reached]
    stage >= min_stage ? thresholds(config)[min_stage] : thresholds(config).first
  end

  # 記録でポイントが増えたあと。増えるときは退化しない
  def apply_gain(points:, stage:, gained:, config: default_config)
    new_points = points + gained
    Change.new(points: new_points, stage: [ stage, stage_for(new_points, config: config) ].max)
  end

  # まだ減少処理をしていない「休んだ日」の数。
  # 前回記録した日（last_recorded_on）と、減少処理を済ませた最後の日（processed_through）の遅いほうの翌日〜昨日
  def missed_days(last_recorded_on:, processed_through:, today:)
    from = [ last_recorded_on, processed_through ].compact.max
    return 0 if from.nil?

    [ (today - 1 - from).to_i, 0 ].max
  end

  # 休んだ日数分を減らしたあと（−200 × 日数）。下限（floor_points）で止め、減るときは進化しない。
  # 段階1以上だったなら段階1より下には退化しない
  def apply_decay(points:, stage:, missed_days:, config: default_config)
    return Change.new(points: points, stage: stage) if missed_days <= 0

    floor = floor_points(stage, config: config)
    new_points = [ [ points - config[:missed_day_penalty] * missed_days, floor ].max, points ].min
    new_stage = stage_for(new_points, config: config)
    min_stage = config[:min_stage_once_reached]
    new_stage = [ new_stage, min_stage ].max if stage >= min_stage
    Change.new(points: new_points, stage: [ new_stage, stage ].min)
  end

  # 次の段階までの進み具合（ホームのゲージ）。最終段階なら next_stage_points は nil、percent は 100。
  # percent は小数1桁（整数で計算してから 10 で割る）
  def progress(points:, stage:, config: default_config)
    current = thresholds(config)[stage]
    following = thresholds(config)[stage + 1]
    if following.nil?
      return { current_stage_points: current, next_stage_points: nil, points_to_next: 0, progress_percent: 100.0 }
    end

    tenths = ((points - current) * 1000 / (following - current)).clamp(0, 1000)
    {
      current_stage_points: current,
      next_stage_points: following,
      points_to_next: [ following - points, 0 ].max,
      progress_percent: tenths / 10.0
    }
  end
end
