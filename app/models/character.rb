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

  # 段階ごとの画像（public/characters/stages/）。ファイル名は段階の数字: 0.png（卵）〜 4.png（つぼみ）。
  # <段階>_<状態>.png（例 2_sleeping.png）→ <段階>.png の順に探し、その段階の画像がなければ下の段階の画像を使う
  # （段階5の画像ができるまでは 4.png）。どれもなければ nil（状態の画像を使う）。
  # 段階の姿が状態の画像より優先（状態の違いは CSS の動きと夜の部屋で出す）。画像は置くだけで切り替わる
  STAGE_IMAGE_DIR = "characters/stages".freeze

  def self.stage_image_path_for(stage, state = "normal")
    stage.downto(0) do |candidate|
      [ "#{candidate}_#{state}", candidate.to_s ].each do |name|
        relative = "#{STAGE_IMAGE_DIR}/#{name}.png"
        return "/#{relative}" if Rails.public_path.join(relative).file?
      end
    end
    nil
  end

  def stage_image_path
    self.class.stage_image_path_for(evolution_stage, state)
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
