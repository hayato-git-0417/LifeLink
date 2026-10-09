# 開始〜終了を持つ記録（睡眠・ワーク）の共通処理（spec.md 2.1）。
# 使う側でカラム名と集計日の決め方を指定する:
#   timed_by start: :slept_at, finish: :woke_at, recorded_on_from: :finish, max_minutes_key: :sleep_max_minutes
module TimedRecord
  extend ActiveSupport::Concern

  included do
    class_attribute :start_column, :finish_column, :recorded_on_from, :max_minutes_key

    belongs_to :user
    enum :record_method, { timer: 0, manual: 1 }, validate: true

    before_validation :fill_derived_columns

    validates :recorded_on, presence: true
    validate :finish_after_start
    validate :within_max_duration
    validate :only_one_in_progress, if: :in_progress?

    scope :in_progress, -> { where(finish_column => nil) }
    scope :finished, -> { where.not(finish_column => nil) }
    scope :between, ->(from, to) { where(recorded_on: from..to) }
  end

  class_methods do
    def timed_by(start:, finish:, recorded_on_from:, max_minutes_key:)
      self.start_column = start
      self.finish_column = finish
      self.recorded_on_from = recorded_on_from
      self.max_minutes_key = max_minutes_key
      validates start, presence: true
    end

    def max_minutes
      GameConfig.timer[max_minutes_key]
    end
  end

  def started_time = self[start_column]
  def finished_time = self[finish_column]

  def in_progress?
    finished_time.nil?
  end

  private

  # duration_minutes と recorded_on（日本時間の日付）を開始・終了から計算する。
  # 集計日を終了側で決める記録（睡眠）は、計測中だけ仮に開始した日を入れ、終了時に入れ直す。
  def fill_derived_columns
    return if started_time.blank?

    self.duration_minutes = finished_time && ((finished_time - started_time) / 60).floor
    base_time = recorded_on_from == :finish && finished_time ? finished_time : started_time
    self.recorded_on = base_time.to_date
  end

  def finish_after_start
    return if started_time.blank? || finished_time.blank?

    errors.add(finish_column, :must_be_after_start) if finished_time <= started_time
  end

  def within_max_duration
    return if duration_minutes.nil?

    errors.add(:duration_minutes, :less_than_or_equal_to, count: self.class.max_minutes) if duration_minutes > self.class.max_minutes
  end

  def only_one_in_progress
    others = self.class.where(user_id: user_id).in_progress.where.not(id: id)
    errors.add(:base, :already_in_progress) if others.exists?
  end
end
