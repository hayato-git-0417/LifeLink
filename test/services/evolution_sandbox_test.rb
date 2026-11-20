require "test_helper"

# 進化のテストパネルの操作（開発用）。本物の加算・減少の処理を通ることを確かめる
class EvolutionSandboxTest < ActiveSupport::TestCase
  NOW = Time.zone.local(2026, 11, 10, 12)
  TODAY = NOW.to_date

  setup do
    travel_to(NOW) { @user = create_user } # 今日登録（登録日は休んだ日に数えない）
    @character = @user.character
    @sandbox = EvolutionSandbox.new(user: @user, now: NOW)
  end

  test "今日の記録は本物と同じく1項目1日1回" do
    assert_equal 110, @sandbox.record(:meal).amount
    assert_nil @sandbox.record(:meal)
    assert_equal 110, @character.reload.evolution_points
  end

  test "翌日へ進めると継続が続き、記録の倍率が上がる。今日記録した項目は空に戻る" do
    @sandbox.record(:meal)
    assert_nil @sandbox.advance(1)

    @character.reload
    assert_equal TODAY - 1, @character.last_recorded_on
    assert_equal 0, @character.evolution_point_logs.recorded.where(target_date: TODAY).count
    assert_equal 120, @sandbox.record(:meal).amount # 2日目 = 1.2倍
    assert_equal 2, @character.reload.streak_days
  end

  test "3日後へ進めると、間の2日を休んだことになり −400・継続 0" do
    @sandbox.set_points(1_000)
    @sandbox.record(:sleep) # 1,110

    log = @sandbox.advance(3)

    assert_equal [ -400, 2 ], [ log.amount, log.missed_days ]
    @character.reload
    assert_equal [ 710, 1, 0 ], [ @character.evolution_points, @character.evolution_stage, @character.streak_days ]
  end

  test "30日間毎日4項目を記録すると 30,600 ポイントで段階3。進化の通知は 1・2・3 の3件。最後の日の翌日になる" do
    before, after = @sandbox.simulate(days: 30, items: 4)

    assert_equal [ 0, 0 ], [ before.points, before.stage ]
    assert_equal [ 30_600, 3 ], [ after.points, after.stage ] # Σ 400 × (1 + 0.1 × 日数)
    @character.reload
    assert_equal 30, @character.streak_days
    assert_equal TODAY - 1, @character.last_recorded_on
    assert_equal 120, @character.evolution_point_logs.count
    assert_equal [ TODAY - 30, TODAY - 1 ], @character.evolution_point_logs.pluck(:target_date).minmax
    assert_equal [ "めばえが進化しました！（進化1）", "めばえが進化しました！（進化2）", "めばえが進化しました！（進化3）" ],
                 @user.notifications.evolution.order(:id).pluck(:title)
  end

  test "90日続けると倍率は10倍で止まる" do
    @sandbox.simulate(days: 92, items: 1)

    multipliers = @character.evolution_point_logs.order(:target_date).pluck(:multiplier_tenths)
    assert_equal [ 11, 12 ], multipliers.first(2)
    assert_equal [ 99, 100, 100, 100 ], multipliers.last(4)
  end

  test "累計ポイントを直接決めると段階もポイントから決まる" do
    @sandbox.set_points(3_000)
    assert_equal [ 3_000, 2 ], [ @character.reload.evolution_points, @character.evolution_stage ]
    @sandbox.set_points(299)
    assert_equal [ 299, 0 ], [ @character.reload.evolution_points, @character.evolution_stage ]
  end

  test "継続日数を決めると昨日まで続いていることになる（89日にして記録すると90日目で10倍）" do
    @sandbox.set_streak(89)
    assert_equal 1_000, @sandbox.record(:work).amount
    assert_equal 90, @character.reload.streak_days
  end

  test "リセットすると最初の状態に戻り、進化の履歴と通知も消える" do
    @sandbox.simulate(days: 3, items: 4)
    @sandbox.reset

    @character.reload
    assert_equal [ 0, 0, 0, nil, TODAY ],
                 [ @character.evolution_points, @character.evolution_stage, @character.streak_days, @character.last_recorded_on, @character.decay_processed_through ]
    assert_equal 0, @character.evolution_point_logs.count
    assert_equal 0, @user.notifications.evolution.count
  end
end
