# ある日・あるユーザーの4項目のスコア（0〜100、ワークだけ上限なし）を計算する（spec.md 3.1）。
#   result = ScoreCalculator.call(user: user, date: Date.new(2026, 10, 6))
#   result.sleep_score     # => 92.9（BigDecimal、小数1桁）
#   result.total_percent   # => 76.5（今日の総合達成度）
# ポイントの換算（spec.md 3.2）もここにまとめる。四捨五入は BigDecimal で行う（float だと 76.45 → 76.4 になるため）。
# 過去の日も「今の目標」で計算する（目標の履歴は持たない。docs/decisions.md）。
class ScoreCalculator
  ITEMS = %i[sleep meal exercise work].freeze

  Result = Struct.new(:sleep_score, :meal_score, :exercise_score, :work_score, :recorded_items_count, keyword_init: true) do
    def scores
      ITEMS.index_with { |item| self[:"#{item}_score"] }
    end

    def total_percent
      ScoreCalculator.total_percent(scores)
    end

    # daily_achievements に入れる値
    def to_attributes
      to_h
    end
  end

  class << self
    def call(user:, date:)
      new(user: user, date: date).call
    end

    # 100 で頭打ちにしたスコア
    def capped(score)
      [ decimal(score), decimal(GameConfig.score_cap) ].min
    end

    # 今日の総合達成度（%） = 各スコアを頭打ちにして重みで合計
    def total_percent(scores)
      ITEMS.sum { |item| capped(scores.fetch(item)) * weight(item) }.round(1)
    end

    # ポイントの増減 = round((min(スコア, 100) − 50) × 2)
    def point_change(score)
      ((capped(score) - decimal(GameConfig.points[:base])) * decimal(GameConfig.points[:multiplier])).round.to_i
    end

    def clamp_points(points)
      points.clamp(GameConfig.points[:min], GameConfig.points[:max])
    end

    # 総合ポイント = round(睡眠pt×0.30 + 食事pt×0.30 + 運動pt×0.20 + ワークpt×0.20)
    def total_points(points)
      ITEMS.sum { |item| decimal(points.fetch(item)) * weight(item) }.round.to_i
    end

    def weight(item)
      decimal(GameConfig.weights.fetch(item))
    end

    def decimal(value)
      BigDecimal(value.to_s)
    end
  end

  def initialize(user:, date:)
    @user = user
    @date = date
    @goal = user.goal
  end

  def call
    Result.new(
      sleep_score: sleep_score,
      meal_score: meal_score,
      exercise_score: exercise_score,
      work_score: work_score,
      recorded_items_count: recorded_items_count
    )
  end

  # 睡眠 = min(睡眠時間の合計 ÷ 目標睡眠時間 × 100, 100)。集計日（起床した日）で合計する
  def sleep_score
    ratio(sleep_minutes, @goal&.target_sleep_minutes, cap: true)
  end

  # 食事 = 栄養素ごとの max(100 − |実際 − 目標| ÷ 目標 × 100, 0) の平均
  def meal_score
    return zero if @goal.nil?

    points = Meal::NUTRIENT_COLUMNS.zip(Goal::NUTRIENT_COLUMNS).map do |meal_column, goal_column|
      target = @goal[goal_column]
      next zero if target.nil? || target <= 0

      actual = self.class.decimal(meal_totals.fetch(meal_column))
      [ 100 - (actual - target).abs / self.class.decimal(target) * 100, zero ].max
    end
    (points.sum / points.size).round(1)
  end

  # 運動 = min(その日に達成したタスク数 ÷ 今有効なタスク数 × 100, 100)。削除済みタスクの達成も数える
  def exercise_score
    ratio(completed_task_count, @user.exercise_tasks.active.count, cap: true)
  end

  # ワーク = ワーク時間の合計 ÷ 目標ワーク時間 × 100（上限なしで保存）
  def work_score
    ratio(work_minutes, @goal&.work_goal_minutes, cap: false)
  end

  private

  def zero = BigDecimal("0")

  # 目標が 0／未設定なら 0（0 除算しない）
  def ratio(actual, target, cap:)
    return zero if target.nil? || target <= 0

    score = self.class.decimal(actual) / self.class.decimal(target) * 100
    score = [ score, self.class.decimal(GameConfig.score_cap) ].min if cap
    score.round(1)
  end

  def sleep_minutes
    @sleep_minutes ||= @user.sleep_records.finished.where(recorded_on: @date).sum(:duration_minutes)
  end

  def work_minutes
    @work_minutes ||= @user.work_records.finished.where(recorded_on: @date).sum(:duration_minutes)
  end

  # 栄養値の合計（未入力は 0 として足す）
  def meal_totals
    @meal_totals ||= begin
      sums = @user.meals.on(@date).pick(*Meal::NUTRIENT_COLUMNS.map { |column| Arel.sql("COALESCE(SUM(#{column}), 0)") })
      Meal::NUTRIENT_COLUMNS.zip(sums).to_h
    end
  end

  def completed_task_count
    @completed_task_count ||= ExerciseTaskCompletion.joins(:exercise_task)
                                                    .where(exercise_tasks: { user_id: @user.id }, target_date: @date).count
  end

  # その日に記録があった項目の数（0〜4）
  def recorded_items_count
    [
      sleep_minutes.positive?,
      @user.meals.on(@date).exists?,
      completed_task_count.positive? || @user.exercise_records.where(recorded_on: @date).exists?,
      work_minutes.positive?
    ].count(true)
  end
end
