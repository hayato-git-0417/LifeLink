# 進化・退化したときの通知（spec.md 4.3・7章）。段階が変わったときだけ作り、一度に何段階変わっても1件。
# 文言は config/locales/ja.yml の game.notifications.evolved / devolved。
#   EvolutionNotifier.call(character: character, log: log, stage_before: 1) # => Notification か nil
class EvolutionNotifier
  def self.call(character:, log:, stage_before:)
    return nil if log.stage_after == stage_before

    key = log.stage_after > stage_before ? :evolved : :devolved
    values = {
      name: character.name,
      stage: log.stage_after,
      points: log.points_after.to_fs(:delimited),
      amount: log.amount.abs.to_fs(:delimited),
      days: log.missed_days
    }
    character.user.notifications.create!(
      notification_type: :evolution,
      notifiable: log,
      title: I18n.t("game.notifications.#{key}.title", **values),
      body: I18n.t("game.notifications.#{key}.body", **values)
    )
  end
end
