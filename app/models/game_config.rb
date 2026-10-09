# config/game.yml の定数を読み出す。コードに数値を直書きせず、必ずここを通す。
#   GameConfig.weights[:sleep]           # => 0.3
#   GameConfig.points[:max]              # => 1000
#   GameConfig.character[:hungry_grace_minutes] # => 60
module GameConfig
  module_function

  def config
    @config ||= Rails.application.config_for(:game)
  end

  def weights = config.dig(:score, :weights)
  def score_cap = config.dig(:score, :cap)
  def points = config[:points]
  def mood = config[:mood]
  def timer = config[:timer]
  def character = config[:character]
  def meal_times = config[:meal_times]
  def pacemaker = config[:pacemaker]

  # テストで値を差し替えたあとに読み直す用
  def reload!
    @config = nil
  end
end
