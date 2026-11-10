require "test_helper"

# 記録したときの進化ポイント（spec.md 4.3）
class EvolutionPointAwarderTest < ActiveSupport::TestCase
  DAY = Date.new(2026, 11, 1)

  setup do
    travel_to(at(DAY, 9)) { @user = create_user } # 登録日 = DAY
    @character = @user.character
  end

  def at(day, hour, min = 0, sec = 0)
    Time.zone.local(day.year, day.month, day.day, hour, min, sec)
  end

  def award(item, time)
    EvolutionPointAwarder.call(user: @user, item: item, now: time)
  end

  test "初日に3項目を記録すると 110 × 3 = 330 ポイントで段階1に進化し、進化の通知が1件届く" do
    award(:sleep, at(DAY, 10))
    award(:meal, at(DAY, 12))
    assert_equal 0, @character.reload.evolution_stage
    award(:exercise, at(DAY, 18))

    @character.reload
    assert_equal 330, @character.evolution_points
    assert_equal 1, @character.evolution_stage
    assert_equal 1, @character.streak_days
    assert_equal DAY, @character.last_recorded_on

    logs = @character.evolution_point_logs.order(:id)
    assert_equal [ 110, 110, 110 ], logs.map(&:amount)
    assert_equal [ 11, 11, 11 ], logs.map(&:multiplier_tenths)
    assert_equal %w[sleep meal exercise], logs.map(&:item)
    assert_equal [ 110, 220, 330 ], logs.map(&:points_after)

    notifications = @user.notifications.evolution
    assert_equal 1, notifications.count
    assert_equal "めばえが進化しました！（進化1）", notifications.first.title
    assert_equal logs.last, notifications.first.notifiable
  end

  test "同じ日に同じ項目を2回記録しても、ポイントは1回分だけ" do
    assert award(:meal, at(DAY, 8))
    assert_nil award(:meal, at(DAY, 19))

    assert_equal 110, @character.reload.evolution_points
    assert_equal 1, @character.evolution_point_logs.count
  end

  test "4項目すべてを記録すると1日の上限（倍率をかける前 400）。それ以上は増えない" do
    ScoreCalculator::ITEMS.each { |item| award(item, at(DAY, 12)) }
    ScoreCalculator::ITEMS.each { |item| assert_nil award(item, at(DAY, 20)) }

    assert_equal 440, @character.reload.evolution_points
  end

  test "継続日数は記録した日が続いた日数（当日を含む）。倍率は 1.1・1.2・1.3 と上がる" do
    3.times { |i| award(:meal, at(DAY + i, 12)) }

    assert_equal [ 110, 120, 130 ], @character.evolution_point_logs.order(:id).map(&:amount)
    assert_equal 3, @character.reload.streak_days
    assert_equal 360, @character.evolution_points
  end

  test "継続91日目以降も、倍率は10倍のまま上がらない" do
    @character.update!(evolution_points: 150_000, evolution_stage: 4, streak_days: 89,
                       last_recorded_on: DAY - 1, decay_processed_through: DAY - 2)

    award(:meal, at(DAY, 12))      # 90日目
    award(:meal, at(DAY + 1, 12))  # 91日目
    award(:meal, at(DAY + 2, 12))  # 92日目

    logs = @character.evolution_point_logs.order(:id)
    assert_equal [ 1_000, 1_000, 1_000 ], logs.map(&:amount)
    assert_equal [ 100, 100, 100 ], logs.map(&:multiplier_tenths)
    assert_equal 92, @character.reload.streak_days
    assert_equal 153_000, @character.evolution_points
  end

  test "日付の境界: 23:59:59 の記録はその日、0:00 の記録は次の日（日本時間）として数える" do
    late = award(:meal, at(DAY, 23, 59, 59))
    early = award(:meal, at(DAY + 1, 0, 0, 0)) # UTC ではまだ前日の 15:00

    assert_equal DAY, late.target_date
    assert_equal DAY + 1, early.target_date
    assert_equal [ 110, 120 ], [ late.amount, early.amount ] # 別の日なので両方入り、2日目は 1.2 倍
    assert_equal 2, @character.reload.streak_days
    assert_equal DAY + 1, @character.last_recorded_on
  end

  test "休んだあとに記録すると、先に休んだ日の分を減らしてから、継続日数 1 で加算する" do
    @character.update!(evolution_points: 1_000, evolution_stage: 1, streak_days: 5,
                       last_recorded_on: DAY, decay_processed_through: DAY - 1)

    log = award(:work, at(DAY + 3, 10)) # DAY+1・DAY+2 を休んだ

    assert_equal 110, log.amount
    @character.reload
    assert_equal 710, @character.evolution_points # 1000 − 400 + 110
    assert_equal 1, @character.streak_days
    assert_equal DAY + 2, @character.decay_processed_through
    assert_equal [ %w[missed -400], %w[recorded 110] ], @character.evolution_point_logs.order(:id).map { |l| [ l.reason, l.amount.to_s ] }
  end

  test "知らない項目は ArgumentError" do
    assert_raises(ArgumentError) { award(:bath, at(DAY, 12)) }
  end
end
