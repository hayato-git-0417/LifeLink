class Character < ApplicationRecord
  # characters / character_state_logs / character_animations で共通の状態（spec.md 4章）
  STATES = { normal: 0, sleeping: 1, sleep_deprived: 2, full: 3, hungry: 4, exercising: 5, studying: 6, fat: 7 }.freeze
  POINT_COLUMNS = %i[sleep_points meal_points exercise_points work_points total_points].freeze

  belongs_to :user
  has_many :character_state_logs, dependent: :destroy
  has_many :evolution_point_logs, dependent: :destroy

  enum :state, STATES, validate: true

  attribute :name, default: -> { GameConfig.character[:default_name] }
  POINT_COLUMNS.each do |column|
    attribute column, default: -> { GameConfig.points[:initial] }
  end

  validates :user_id, uniqueness: true
  validates :name, length: { maximum: 30 }
  validates(*POINT_COLUMNS, numericality: {
    only_integer: true,
    greater_than_or_equal_to: ->(_) { GameConfig.points[:min] },
    less_than_or_equal_to: ->(_) { GameConfig.points[:max] }
  })
  # 進化（spec.md 4.3）。累計ポイントは下限で止めるので 0 未満にならない
  validates :evolution_points, :streak_days, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :evolution_stage, numericality: {
    only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: ->(_) { EvolutionRules.max_stage }
  }

  # 状態に対応する画像（外部キーではなく state の値で探す）
  def animation
    CharacterAnimation.find_by(state: state)
  end

  # 画像のパス。進化の段階ごとの画像があればそれを使う（stage_image_path）。
  # なければ状態の画像（character_animations、なければ規約どおり public/characters/<state>.png）
  def image_path
    stage_image_path || animation&.gif_path || "/characters/#{state}.png"
  end

  # 段階ごとの画像: public/characters/stage<段階>/<state>.png → なければ stage<段階>/normal.png。どちらもなければ nil。
  # 画像ができたらフォルダに置くだけで切り替わる（段階の姿が状態の画像より優先。状態の違いは CSS の動きで出す）
  def stage_image_path
    [ state, "normal" ].uniq.each do |name|
      relative = "characters/stage#{evolution_stage}/#{name}.png"
      return "/#{relative}" if Rails.public_path.join(relative).file?
    end
    nil
  end

  # 気分バッジ（spec.md 3.4【仮】）。総合ポイントの下限が高い順に見て最初に当てはまったもの
  def mood
    entry = GameConfig.mood.find { |m| total_points >= m[:min_points] } || GameConfig.mood.last
    { key: entry[:key], label: entry[:label] }
  end

  def state_label
    I18n.t("game.states.#{state}")
  end
end
