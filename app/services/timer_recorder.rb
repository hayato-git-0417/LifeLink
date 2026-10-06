# 睡眠・ワークのタイマー操作（spec.md 2.1）。ホームのボタン（start / finish / cancel）と詳細画面の修正・削除。
#   TimerRecorder.new(user: current_user, kind: :sleep).start
# 結果の record は操作した記録、auto_finished は就寝時に自動終了したワーク。
# 記録が変わった日は DailyAchievementUpdater に渡す（確定済みの日のポイントは動かさない: spec.md 2.1）。
class TimerRecorder
  KINDS = { sleep: SleepRecord, work: WorkRecord }.freeze

  Result = Struct.new(:record, :auto_finished, :errors, keyword_init: true) do
    def success? = errors.blank?
  end

  def initialize(user:, kind:)
    @user = user
    @kind = kind.to_sym
    @klass = KINDS.fetch(@kind)
  end

  # 就寝／ワーク開始。すでに計測中なら失敗。
  # 就寝時にワーク計測中ならワークをその時刻で終了し、睡眠中はワークを開始できない（spec.md 2.1【仮】）
  def start(at: Time.current, attributes: {})
    return failure(:already_in_progress) if in_progress_record
    return failure(:cannot_start_work_while_sleeping) if @kind == :work && @user.sleep_records.in_progress.exists?

    result = nil
    ApplicationRecord.transaction do
      auto_finished = finish_work_for_sleep(at) if @kind == :sleep
      record = scope.build(attributes.merge(@klass.start_column => at, record_method: :timer))
      unless record.save
        result = failure_from(record)
        raise ActiveRecord::Rollback # ワークの自動終了も取り消す
      end

      result = success(record, auto_finished: auto_finished)
    end
    result
  end

  # 起床／ワーク終了
  def finish(at: Time.current)
    record = in_progress_record
    return failure(:not_in_progress) unless record

    record[@klass.finish_column] = at
    return failure_from(record) unless record.save

    refresh(record.recorded_on)
    success(record)
  end

  # 計測中の押し間違いの取り消し。記録は残さない
  def cancel
    record = in_progress_record
    return failure(:not_in_progress) unless record

    record.destroy!
    success(record)
  end

  # 詳細画面での修正。終了済みの記録だけ。開始・終了から集計日と時間を計算し直す
  def update(record, started:, finished:, attributes: {})
    return failure(:in_progress_not_editable) if record.in_progress?
    return failure(:finish_in_future) if finished > Time.current

    old_date = record.recorded_on
    record.assign_attributes(attributes.merge(@klass.start_column => started, @klass.finish_column => finished))
    return failure_from(record) unless record.save

    refresh(old_date, record.recorded_on)
    success(record)
  end

  def destroy(record)
    record.destroy!
    refresh(record.recorded_on) unless record.in_progress?
    success(record)
  end

  private

  def scope
    @user.public_send(@klass.model_name.plural)
  end

  def in_progress_record
    scope.in_progress.first
  end

  # 就寝時刻でワークを終了する。開始と同じ時刻なら（押し間違いとみなして）消す
  def finish_work_for_sleep(at)
    work = @user.work_records.in_progress.first
    return nil unless work

    if work.started_at >= at
      work.destroy!
      return nil
    end

    work.update!(ended_at: at)
    refresh(work.recorded_on)
    work
  end

  def refresh(*dates)
    DailyAchievementUpdater.call(user: @user, dates: dates)
  end

  def success(record, auto_finished: nil)
    Result.new(record: record, auto_finished: auto_finished, errors: [])
  end

  def failure(key)
    Result.new(errors: [ I18n.t("api.errors.timer.#{key}", model: @klass.model_name.human) ])
  end

  def failure_from(record)
    Result.new(record: record, errors: record.errors.full_messages)
  end
end
