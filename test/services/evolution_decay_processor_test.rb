require "test_helper"

# 記録しなかった日の減少（spec.md 4.3）
class EvolutionDecayProcessorTest < ActiveSupport::TestCase
  DAY = Date.new(2026, 11, 1)

  setup do
    travel_to(at(DAY - 10, 9)) { @user = create_user }
    @character = @user.character
  end

  def at(day, hour, min = 0)
    Time.zone.local(day.year, day.month, day.day, hour, min)
  end

  def process(time)
    EvolutionDecayProcessor.call(user: @user, now: time)
  end

  # day に記録した状態（その日の減少処理は済み）にする
  def recorded_on(day, points:, stage:, streak: 3)
    @character.update!(evolution_points: points, evolution_stage: stage, streak_days: streak,
                       last_recorded_on: day, decay_processed_through: day - 1)
  end

  test "2日休んだ後にログインすると、ポイントが −400 され、継続日数が 0 になる" do
    recorded_on(DAY, points: 1_000, stage: 1, streak: 5)

    log = process(at(DAY + 3, 9)) # DAY+1・DAY+2 を休んだ（今日 DAY+3 は数えない）

    @character.reload
    assert_equal 600, @character.evolution_points
    assert_equal 0, @character.streak_days
    assert_equal 1, @character.evolution_stage
    assert_equal DAY + 2, @character.decay_processed_through
    assert_equal [ "missed", -400, 2, DAY + 3 ], [ log.reason, log.amount, log.missed_days, log.target_date ]
    assert_equal 0, @user.notifications.evolution.count # 段階は変わらないので通知しない
  end

  test "同じ日にもう一度ログインしても、減少は二重に適用されない。翌日は新しく休んだ1日分だけ減る" do
    recorded_on(DAY, points: 1_000, stage: 1)

    assert process(at(DAY + 3, 9))
    assert_nil process(at(DAY + 3, 23, 59))
    assert_equal 600, @character.reload.evolution_points
    assert_equal 1, @character.evolution_point_logs.count

    log = process(at(DAY + 4, 0, 1)) # DAY+3 も記録しなかった
    assert_equal [ -200, 1 ], [ log.amount, log.missed_days ]
    assert_equal 400, @character.reload.evolution_points
  end

  test "昨日記録していれば（今日がまだでも）減らさない" do
    recorded_on(DAY, points: 1_000, stage: 1, streak: 5)

    assert_nil process(at(DAY + 1, 23))
    @character.reload
    assert_equal 1_000, @character.evolution_points
    assert_equal 5, @character.streak_days
    assert_equal DAY, @character.decay_processed_through
  end

  test "段階2（3,200ポイント）で2日休むと、2,800ポイントになり段階1に退化し、退化の通知が届く" do
    recorded_on(DAY, points: 3_200, stage: 2)

    log = process(at(DAY + 3, 9))

    @character.reload
    assert_equal 2_800, @character.evolution_points
    assert_equal 1, @character.evolution_stage
    notification = @user.notifications.evolution.sole
    assert_equal "めばえが退化してしまいました（進化1）", notification.title
    assert_equal "記録しなかった日が2日あり、ポイントが400pt減りました（累計2,800pt）。毎日記録してまた進化させよう。", notification.body
    assert_equal log, notification.notifiable
  end

  test "一度に何段階でも退化する（段階3 → 段階1）。通知は1件" do
    recorded_on(DAY, points: 25_000, stage: 3)

    process(at(DAY + 121, 9)) # 120日休んだ: 25000 − 24000

    @character.reload
    assert_equal [ 1_000, 1 ], [ @character.evolution_points, @character.evolution_stage ]
    assert_equal 1, @user.notifications.evolution.count
  end

  test "段階1で長く休んでも、ポイントは 300 で止まり、段階1のまま" do
    recorded_on(DAY, points: 500, stage: 1)

    log = process(at(DAY + 31, 9)) # 30日休んだ

    @character.reload
    assert_equal [ 300, 1 ], [ @character.evolution_points, @character.evolution_stage ]
    assert_equal [ -200, 30 ], [ log.amount, log.missed_days ] # 実際に減った分を残す

    process(at(DAY + 40, 9))
    assert_equal [ 300, 1 ], [ @character.reload.evolution_points, @character.evolution_stage ]
    assert_equal 0, @user.notifications.evolution.count
  end

  test "段階0でポイントが減っても、0 未満にならない" do
    recorded_on(DAY, points: 220, stage: 0)

    process(at(DAY + 3, 9))
    assert_equal [ 0, 0 ], [ @character.reload.evolution_points, @character.evolution_stage ]

    process(at(DAY + 5, 9))
    assert_equal [ 0, 0 ], [ @character.reload.evolution_points, @character.evolution_stage ]
  end

  test "登録した日は休んだ日に数えない（一度も記録していなくても登録日の翌日から）" do
    registered_on = DAY - 10
    assert_equal registered_on, @character.decay_processed_through

    log = process(at(registered_on + 3, 9))
    assert_equal 2, log.missed_days
  end

  test "機能を入れる前からいるユーザー（処理済みの日がない）は、さかのぼって減らさない" do
    @character.update!(evolution_points: 0, decay_processed_through: nil, last_recorded_on: nil)

    assert_nil process(at(DAY, 9))
    assert_equal DAY - 1, @character.reload.decay_processed_through
    assert_equal 0, @character.evolution_point_logs.count
  end
end
