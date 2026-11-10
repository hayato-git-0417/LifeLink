require "test_helper"
require "minitest/mock"

class CharacterTest < ActiveSupport::TestCase
  test "ユーザーを作るとキャラも作られる。既定値は 名前めばえ・状態normal・各ポイント500・last_reset_on＝登録日" do
    travel_to Time.zone.local(2026, 10, 6, 23, 0) do
      character = create_user.character

      assert character.persisted?
      assert_equal GameConfig.character[:default_name], character.name
      assert character.normal?
      assert_equal Date.new(2026, 10, 6), character.last_reset_on
      Character::POINT_COLUMNS.each do |column|
        assert_equal GameConfig.points[:initial], character[column], column
      end
    end
  end

  test "ポイントは 0〜1000 の範囲だけ" do
    character = create_user.character
    character.sleep_points = GameConfig.points[:max] + 1
    assert_not character.valid?
    character.sleep_points = GameConfig.points[:min] - 1
    assert_not character.valid?
    character.sleep_points = GameConfig.points[:max]
    assert character.valid?
  end

  test "進化の既定値は 0pt・段階0・継続0日。登録日は減少を済ませた日にする" do
    travel_to Time.zone.local(2026, 11, 1, 23, 30) do
      character = create_user.character
      assert_equal [ 0, 0, 0, nil ], [ character.evolution_points, character.evolution_stage, character.streak_days, character.last_recorded_on ]
      assert_equal Date.new(2026, 11, 1), character.decay_processed_through
    end
  end

  test "段階の画像: stages/<段階>_<状態>.png → stages/<段階>.png → 下の段階の画像 → 状態の画像 の順に探す" do
    character = create_user.character
    character.update!(evolution_stage: 2, state: :sleeping)

    Dir.mktmpdir do |dir|
      public_dir = Pathname(dir)
      stages = public_dir.join("characters/stages")
      Rails.stub(:public_path, public_dir) do
        assert_equal "/characters/sleeping.png", character.image_path # 段階の画像がまだない

        FileUtils.mkdir_p(stages)
        FileUtils.touch(stages.join("1.png"))
        assert_equal "/characters/stages/1.png", character.image_path # 段階2の画像がないので段階1

        FileUtils.touch(stages.join("2.png"))
        assert_equal "/characters/stages/2.png", character.image_path

        FileUtils.touch(stages.join("2_sleeping.png"))
        assert_equal "/characters/stages/2_sleeping.png", character.image_path
      end
    end
  end

  test "リポジトリの段階の画像: 0〜4 はそれぞれの画像、5 は画像ができるまで 4" do
    assert_equal (0..4).map { |stage| "/characters/stages/#{stage}.png" }, (0..4).map { |stage| Character.stage_image_path_for(stage) }
    assert_equal "/characters/stages/4.png", Character.stage_image_path_for(5)
  end

  test "1ユーザーにつき1匹" do
    user = create_user
    assert_not Character.new(user: user).valid?
  end

  test "状態に対応する画像を state の値で探す" do
    CharacterAnimation.create!(state: :sleeping, gif_path: "/characters/sleeping.png")
    character = create_user.character
    character.update!(state: :sleeping)
    assert_equal "/characters/sleeping.png", character.animation.gif_path
  end

  test "8つの状態が enum で使える" do
    assert_equal %w[normal sleeping sleep_deprived full hungry exercising studying fat], Character.states.keys
    assert_equal Character.states, CharacterStateLog.states
    assert_equal Character.states, CharacterAnimation.states
  end
end
