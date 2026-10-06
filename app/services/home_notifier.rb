# ホーム表示時の判定で通知を作る（spec.md 7章【仮】）。プッシュ・メールはなし（アプリ内のみ）。
# - character: 睡眠不足・空腹になったとき。状態ごとに1日1回
# - reminder: 就寝リマインドの時間帯（睡眠目標が「時間帯」のときだけ）。1日1回
# - task: 20時以降に未完了の運動タスクがあるとき。1日1回
# 「1日1回」は、同じ種類・同じタイトルの通知が今日（日本時間）すでにあるかで判定する。
# follow（フォローされた）はフォロー時に作る（フェーズ7）。
#   HomeNotifier.call(user: current_user, resolved: CharacterStateResolver.call(user: current_user))
class HomeNotifier
  CHARACTER_STATES = %w[sleep_deprived hungry].freeze

  def self.call(user:, resolved:, now: Time.current)
    new(user: user, resolved: resolved, now: now).call
  end

  def initialize(user:, resolved:, now:)
    @user = user
    @resolved = resolved
    @now = now
  end

  # 作った通知の配列を返す
  def call
    created = []
    created << notify(:character, @resolved.state) if CHARACTER_STATES.include?(@resolved.state)
    created << notify(:reminder, :bedtime) if @resolved.bedtime_reminder
    created << notify(:task, :tasks_remaining) if @resolved.tasks_remaining
    created.compact
  end

  private

  def notify(type, key)
    title = I18n.t("game.notifications.#{key}.title")
    today = @user.notifications.where(notification_type: type, title: title, created_at: @now.all_day)
    return nil if today.exists?

    @user.notifications.create!(notification_type: type, title: title, body: I18n.t("game.notifications.#{key}.body"))
  end
end
