require "test_helper"

# 進化の計算（純粋な関数）。値は config/game.yml の evolution
class EvolutionRulesTest < ActiveSupport::TestCase
  DAY = Date.new(2026, 11, 1)

  test "倍率は 1 + 0.1 × 継続日数（10 分の 1 単位）。90日目で10倍になり、それ以上は上がらない" do
    assert_equal 11, EvolutionRules.multiplier_tenths(1)
    assert_equal 12, EvolutionRules.multiplier_tenths(2)
    assert_equal 99, EvolutionRules.multiplier_tenths(89)
    assert_equal 100, EvolutionRules.multiplier_tenths(90)
    assert_equal 100, EvolutionRules.multiplier_tenths(91)
    assert_equal 100, EvolutionRules.multiplier_tenths(1000)
  end

  test "記録1回のポイント = 100 × 倍率。91日目以降も 1000 のまま" do
    assert_equal 110, EvolutionRules.record_points(1)
    assert_equal 130, EvolutionRules.record_points(3)
    assert_equal 1000, EvolutionRules.record_points(90)
    assert_equal 1000, EvolutionRules.record_points(91)
  end

  test "倍率をかけた結果は整数演算で切り捨てる" do
    config = GameConfig.evolution.deep_dup
    config[:points_per_record] = 105
    assert_equal 115, EvolutionRules.record_points(1, config: config) # 105 × 1.1 = 115.5 → 115
    assert_equal 126, EvolutionRules.record_points(2, config: config) # 105 × 1.2 = 126
    assert_equal 136, EvolutionRules.record_points(3, config: config) # 105 × 1.3 = 136.5 → 136
  end

  test "段階は累計ポイントの到達ラインで決まる（境目ちょうどで上がる）" do
    {
      0 => 0, 299 => 0, 300 => 1, 2_999 => 1, 3_000 => 2, 24_999 => 2, 25_000 => 3,
      149_999 => 3, 150_000 => 4, 999_999 => 4, 1_000_000 => 5, 5_000_000 => 5
    }.each do |points, stage|
      assert_equal stage, EvolutionRules.stage_for(points), "#{points} pt"
    end
    assert_equal 5, EvolutionRules.max_stage
  end

  test "ポイントが増えるときは、届いた段階まで一気に進化する（退化はしない）" do
    assert_equal EvolutionRules::Change.new(points: 330, stage: 1), EvolutionRules.apply_gain(points: 220, stage: 0, gained: 110)
    assert_equal EvolutionRules::Change.new(points: 30_000, stage: 3), EvolutionRules.apply_gain(points: 0, stage: 0, gained: 30_000)
    assert_equal EvolutionRules::Change.new(points: 410, stage: 1), EvolutionRules.apply_gain(points: 300, stage: 1, gained: 110)
  end

  test "減少: −200 × 休んだ日数。段階2（3,200）で2日休むと 2,800 で段階1" do
    assert_equal EvolutionRules::Change.new(points: 2_800, stage: 1), EvolutionRules.apply_decay(points: 3_200, stage: 2, missed_days: 2)
  end

  test "減少: 一度に何段階でも退化するが、段階1より下には下がらず、ポイントも 300 で止まる" do
    assert_equal EvolutionRules::Change.new(points: 1_000, stage: 1), EvolutionRules.apply_decay(points: 25_000, stage: 3, missed_days: 120)
    assert_equal EvolutionRules::Change.new(points: 300, stage: 1), EvolutionRules.apply_decay(points: 500, stage: 1, missed_days: 30)
    assert_equal EvolutionRules::Change.new(points: 300, stage: 1), EvolutionRules.apply_decay(points: 300, stage: 1, missed_days: 1)
  end

  test "減少: 段階0は 0 未満にならない" do
    assert_equal EvolutionRules::Change.new(points: 0, stage: 0), EvolutionRules.apply_decay(points: 220, stage: 0, missed_days: 2)
    assert_equal EvolutionRules::Change.new(points: 0, stage: 0), EvolutionRules.apply_decay(points: 0, stage: 0, missed_days: 5)
  end

  test "減少: 休んだ日が 0 なら変わらない" do
    assert_equal EvolutionRules::Change.new(points: 1_000, stage: 1), EvolutionRules.apply_decay(points: 1_000, stage: 1, missed_days: 0)
  end

  test "休んだ日数 = 前回記録した日（か処理済みの日）の翌日〜昨日。今日は数えない" do
    assert_equal 2, EvolutionRules.missed_days(last_recorded_on: DAY, processed_through: DAY - 1, today: DAY + 3)
    assert_equal 0, EvolutionRules.missed_days(last_recorded_on: DAY, processed_through: DAY - 1, today: DAY + 1)
    assert_equal 0, EvolutionRules.missed_days(last_recorded_on: DAY, processed_through: DAY - 1, today: DAY)
    # 処理済みの日より前の休みは数え直さない
    assert_equal 1, EvolutionRules.missed_days(last_recorded_on: DAY, processed_through: DAY + 2, today: DAY + 4)
    assert_equal 0, EvolutionRules.missed_days(last_recorded_on: DAY, processed_through: DAY + 2, today: DAY + 3)
    # 一度も記録していない人は、処理済みの日（登録日）の翌日から数える
    assert_equal 3, EvolutionRules.missed_days(last_recorded_on: nil, processed_through: DAY, today: DAY + 4)
    assert_equal 0, EvolutionRules.missed_days(last_recorded_on: nil, processed_through: nil, today: DAY + 4)
  end

  test "記録したあとの継続日数: 今日2回目はそのまま、前回が昨日なら +1、空いていたら 1 から" do
    assert_equal 3, EvolutionRules.streak_after_record(last_recorded_on: DAY, streak_days: 3, date: DAY)
    assert_equal 4, EvolutionRules.streak_after_record(last_recorded_on: DAY - 1, streak_days: 3, date: DAY)
    assert_equal 1, EvolutionRules.streak_after_record(last_recorded_on: DAY - 2, streak_days: 3, date: DAY)
    assert_equal 1, EvolutionRules.streak_after_record(last_recorded_on: nil, streak_days: 0, date: DAY)
  end

  test "画面の継続日数と今日の倍率: 昨日まで続いていれば、今日記録したときの倍率を出す" do
    assert_equal 3, EvolutionRules.current_streak(last_recorded_on: DAY - 1, streak_days: 3, today: DAY)
    assert_equal 3, EvolutionRules.current_streak(last_recorded_on: DAY, streak_days: 3, today: DAY)
    assert_equal 0, EvolutionRules.current_streak(last_recorded_on: DAY - 2, streak_days: 3, today: DAY)
    assert_equal 0, EvolutionRules.current_streak(last_recorded_on: nil, streak_days: 0, today: DAY)

    assert_equal 14, EvolutionRules.today_multiplier_tenths(last_recorded_on: DAY - 1, streak_days: 3, today: DAY)
    assert_equal 13, EvolutionRules.today_multiplier_tenths(last_recorded_on: DAY, streak_days: 3, today: DAY)
    assert_equal 11, EvolutionRules.today_multiplier_tenths(last_recorded_on: nil, streak_days: 0, today: DAY)
  end

  test "次の段階までの進み具合（ゲージ）" do
    assert_equal({ current_stage_points: 300, next_stage_points: 3_000, points_to_next: 2_670, progress_percent: 1.1 },
                 EvolutionRules.progress(points: 330, stage: 1))
    assert_equal({ current_stage_points: 0, next_stage_points: 300, points_to_next: 300, progress_percent: 0.0 },
                 EvolutionRules.progress(points: 0, stage: 0))
    assert_equal({ current_stage_points: 0, next_stage_points: 300, points_to_next: 80, progress_percent: 73.3 },
                 EvolutionRules.progress(points: 220, stage: 0))
    assert_equal({ current_stage_points: 1_000_000, next_stage_points: nil, points_to_next: 0, progress_percent: 100.0 },
                 EvolutionRules.progress(points: 1_200_000, stage: 5))
  end
end
