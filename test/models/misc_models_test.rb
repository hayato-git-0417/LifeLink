require "test_helper"

# 小さいモデル（通知・日ごとの達成度・運動の記録・栄養の基準・キャラ画像）のテスト
class MiscModelsTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  test "通知: 未読の数え方と既読" do
    first = @user.notifications.create!(notification_type: :character, title: "ねむそうにしています")
    @user.notifications.create!(notification_type: :task, title: "運動タスクが残っています")
    assert_equal 2, @user.notifications.unread.count

    first.mark_as_read!
    assert first.read?
    assert_equal 1, @user.notifications.unread.count
  end

  test "日ごとの達成度: 1日1行、確定済みかどうか" do
    date = Date.new(2026, 10, 5)
    achievement = @user.daily_achievements.create!(target_date: date, work_score: 200)
    assert_not achievement.finalized?
    assert_not @user.daily_achievements.build(target_date: date).valid?

    achievement.update!(finalized_at: Time.current)
    assert_equal [ achievement ], @user.daily_achievements.finalized.to_a
  end

  test "日ごとの達成度: ワークスコアは100を超えて保存できるがマイナスは不可" do
    assert @user.daily_achievements.build(target_date: Date.new(2026, 10, 5), work_score: 200).valid?
    assert_not @user.daily_achievements.build(target_date: Date.new(2026, 10, 5), sleep_score: -1).valid?
  end

  test "運動の記録: 手入力が既定で、集計日は記録日時から決まる" do
    record = @user.exercise_records.create!(started_at: Time.zone.local(2026, 10, 6, 18), distance_km: 2.5)
    assert record.manual?
    assert_equal Date.new(2026, 10, 6), record.recorded_on
    assert_not @user.exercise_records.build(started_at: Time.current, distance_km: -1).valid?
  end

  test "栄養の基準: 年齢で引ける" do
    standard = NutritionStandard.create!(gender: :male, age_from: 18, age_to: 29, activity_level: :moderate, calories: 2600)
    assert_equal [ standard ], NutritionStandard.male.moderate.for_age(20).to_a
    assert_empty NutritionStandard.for_age(30)
    assert_not NutritionStandard.new(gender: :male, age_from: 18, age_to: 29, activity_level: :moderate, calories: 1).valid?
  end

  test "キャラ画像: 1状態1行" do
    CharacterAnimation.create!(state: :normal, gif_path: "/characters/normal.png")
    assert_not CharacterAnimation.new(state: :normal, gif_path: "/characters/normal.png").valid?
  end

  test "キャラの状態の履歴" do
    character = @user.create_character!
    log = character.character_state_logs.create!(state: :hungry, target_date: Date.new(2026, 10, 6), started_at: Time.current, reason: "朝食の記録がない")
    assert_equal [ log ], character.character_state_logs.current.to_a
  end
end
