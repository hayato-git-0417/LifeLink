# キャラの状態を決める（spec.md 4.1）。上から順に最初に当てはまったもの。
# 変わったら characters.state を更新し、character_state_logs の今の行を閉じて新しい行を作る。
# 吹き出しメッセージ（spec.md 4.2）と、通知に使うペースメーカーの判定結果も返す。
#   result = CharacterStateResolver.call(user: current_user)
#   result.state    # => "hungry"
#   result.message  # => "おなかすいた…"
class CharacterStateResolver
  Result = Struct.new(:state, :reason, :changed, :message, :bedtime_reminder, :tasks_remaining, keyword_init: true)

  def self.call(user:, now: Time.current)
    new(user: user, now: now).call
  end

  def initialize(user:, now:)
    @user = user
    @now = now
    @today = now.to_date
    @goal = user.goal
    @character = user.character
    @settings = GameConfig.character
  end

  def call
    state, reason = decide
    changed = apply(state, reason)
    Result.new(
      state: state.to_s, reason: reason, changed: changed,
      message: message_for(state),
      bedtime_reminder: bedtime_reminder?, tasks_remaining: tasks_remaining?
    )
  end

  # 状態だけを返す（保存しない）
  def decide
    if sleeping?
      [ :sleeping, "睡眠を計測中" ]
    elsif exercised_recently?
      [ :exercising, "運動タスクにチェックしてから#{@settings[:exercising_minutes_after_task]}分以内" ]
    elsif @user.work_records.in_progress.exists?
      [ :studying, "ワークを計測中" ]
    elsif ate_recently?
      [ :full, "食事から#{@settings[:full_minutes_after_meal]}分以内" ]
    elsif (meal_type = hungry_meal_type)
      [ :hungry, "#{I18n.t("game.meal_types.#{meal_type}")}の記録がない" ]
    elsif sleep_deprived?
      [ :sleep_deprived, "今日の睡眠スコアが#{@settings[:sleep_deprived_score_below]}未満" ]
    elsif @character.exercise_points < @settings[:fat_exercise_points_below]
      [ :fat, "運動ポイントが#{@settings[:fat_exercise_points_below]}未満" ]
    else
      [ :normal, nil ]
    end
  end

  private

  def sleeping?
    @sleeping ||= @user.sleep_records.in_progress.exists?
  end

  def exercised_recently?
    since = @now - @settings[:exercising_minutes_after_task].minutes
    ExerciseTaskCompletion.joins(:exercise_task)
                          .where(exercise_tasks: { user_id: @user.id }, completed_at: since..@now).exists?
  end

  def ate_recently?
    @user.meals.where(eaten_at: (@now - @settings[:full_minutes_after_meal].minutes)..@now).exists?
  end

  # 食事時刻から猶予（60分）を過ぎても、その区分の今日の記録がなければ空腹。
  # 空腹は次の食事時刻（夕食はその日の終わり）まで。食事時刻より後にどれかの食事を記録したら止まる。
  # 食事時刻が未設定の区分は判定しない
  def hungry_meal_type
    return nil if @goal.nil?

    slots = Goal::MEAL_TIME_COLUMNS.filter_map do |column|
      time = @goal[column]
      time && [ column.to_s.delete_suffix("_time"), at_today(time) ]
    end.sort_by(&:last)

    slots.each_with_index do |(meal_type, meal_at), index|
      until_at = slots[index + 1]&.last || @today.end_of_day
      next unless (meal_at + @settings[:hungry_grace_minutes].minutes) <= @now && @now < until_at
      next if @user.meals.on(@today).where(meal_type: meal_type).exists?
      next if @user.meals.where(eaten_at: meal_at..@now).exists?

      return meal_type
    end
    nil
  end

  # 今日起床していて（今日の集計日の睡眠記録がある）、今日の睡眠スコアがしきい値未満
  def sleep_deprived?
    return false unless @user.sleep_records.finished.where(recorded_on: @today).exists?

    ScoreCalculator.new(user: @user, date: @today).sleep_score < @settings[:sleep_deprived_score_below]
  end

  # 就寝リマインド: 睡眠目標が「時間帯」のときだけ。就寝時刻の30分前から起床時刻までで、睡眠中でないとき。
  # その間にすでに起床している（昼寝など、または早起き）ときは出さない
  def bedtime_reminder?
    return false if @goal.nil? || !@goal.time_range? || @goal.bedtime.nil? || @goal.wake_time.nil? || sleeping?

    window = bedtime_window
    return false unless window&.cover?(@now)

    !@user.sleep_records.finished.where(woke_at: window.first..@now).exists?
  end

  # 今の時刻を含む「就寝30分前〜起床時刻」。日をまたぐので前後の日の就寝時刻から始まる枠も見る
  # （就寝 0:00 なら、今日 23:30 からの枠は「明日の就寝時刻」の枠）
  def bedtime_window
    before = GameConfig.pacemaker[:bedtime_reminder_minutes_before].minutes
    [ @today - 1, @today, @today + 1 ].map do |day|
      start_at = at_day(day, @goal.bedtime) - before
      end_at = at_day(day, @goal.wake_time)
      end_at += 1.day while end_at <= start_at
      start_at...end_at
    end.find { |range| range.cover?(@now) }
  end

  # 20時以降に今日チェックしていない有効なタスクがある
  def tasks_remaining?
    return false if @now.hour < GameConfig.pacemaker[:task_reminder_hour]

    tasks = @user.exercise_tasks.active
    tasks.exists? && tasks.where.not(id: ExerciseTaskCompletion.on(@today).select(:exercise_task_id)).exists?
  end

  # 吹き出しは1つだけ。就寝リマインド → 睡眠不足 → 空腹 → 未完了タスク → 状態に合ったひとこと
  def message_for(state)
    key =
      if bedtime_reminder? then :bedtime
      elsif state == :sleep_deprived then :sleep_deprived
      elsif state == :hungry then :hungry
      elsif tasks_remaining? then :tasks_remaining
      else :"state_#{state}"
      end
    I18n.t("game.messages.#{key}")
  end

  # 変わったときだけ保存する。日付が変わっても同じ状態なら履歴は続ける
  def apply(state, reason)
    return false if @character.state == state.to_s

    ApplicationRecord.transaction do
      @character.character_state_logs.current.update_all(ended_at: @now)
      @character.character_state_logs.create!(state: state, reason: reason, target_date: @today, started_at: @now)
      @character.update!(state: state, state_changed_at: @now)
    end
    true
  end

  def at_today(time) = at_day(@today, time)

  # time 型（2000-01-01 07:00）をその日の日本時間の時刻にする
  def at_day(day, time)
    Time.zone.local(day.year, day.month, day.day, time.hour, time.min)
  end
end
