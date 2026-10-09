# 日付が変わったら前日までの分を確定し、キャラのポイントへ反映する（spec.md 3.2）。
# characters.last_reset_on の翌日から昨日までを1日ずつ確定する。cron は使わず、ホーム・記録 API へのアクセス時に呼ぶ。
#   DailyFinalizer.call(user: current_user) # => 確定した daily_achievements の配列
# - 記録のない日はスコア 0（−100）。登録日は last_reset_on = 登録日 なので対象外
# - finalized_at の付いた日は飛ばす（二重反映の防止）。キャラの行をロックして1トランザクションで行う
# - 目標が未登録の間はポイントを動かさない（docs/decisions.md【仮】）
class DailyFinalizer
  def self.call(user:, now: Time.current)
    new(user: user, now: now).call
  end

  def initialize(user:, now:)
    @user = user
    @now = now
    @yesterday = now.to_date - 1
  end

  def call
    character = @user.character
    return [] if character.nil? || character.last_reset_on.nil? || character.last_reset_on >= @yesterday

    finalized = []
    character.with_lock do # ロックを取り直すので、同時に呼ばれても後の方は確定済みの日付から続ける
      (character.last_reset_on + 1..@yesterday).each do |date|
        achievement = finalize(character, date)
        finalized << achievement if achievement
        character.last_reset_on = date
      end
      character.save!
    end
    finalized
  end

  private

  def finalize(character, date)
    achievement = @user.daily_achievements.find_or_initialize_by(target_date: date)
    return nil if achievement.finalized?

    result = ScoreCalculator.call(user: @user, date: date)
    goal_registered = @user.goal.present?

    points = {}
    ScoreCalculator::ITEMS.each do |item|
      change = goal_registered ? ScoreCalculator.point_change(result[:"#{item}_score"]) : 0
      points[item] = ScoreCalculator.clamp_points(character[:"#{item}_points"] + change)
      # 上下限で止まったときは、実際に動いた分を増減として残す
      achievement[:"#{item}_change"] = points[item] - character[:"#{item}_points"]
      achievement[:"#{item}_points"] = points[item]
      character[:"#{item}_points"] = points[item]
    end
    character.total_points = achievement.total_points = ScoreCalculator.total_points(points)

    achievement.assign_attributes(result.to_attributes)
    achievement.finalized_at = @now
    achievement.save!
    achievement
  end
end
