require "test_helper"

class CharacterTest < ActiveSupport::TestCase
  test "作成時の既定値は 名前めばえ・状態normal・各ポイント500（game.yml）" do
    character = create_user.create_character!

    assert_equal GameConfig.character[:default_name], character.name
    assert character.normal?
    Character::POINT_COLUMNS.each do |column|
      assert_equal GameConfig.points[:initial], character[column], column
    end
  end

  test "ポイントは 0〜1000 の範囲だけ" do
    character = create_user.build_character
    character.sleep_points = GameConfig.points[:max] + 1
    assert_not character.valid?
    character.sleep_points = GameConfig.points[:min] - 1
    assert_not character.valid?
    character.sleep_points = GameConfig.points[:max]
    assert character.valid?
  end

  test "1ユーザーにつき1匹" do
    user = create_user
    user.create_character!
    assert_not Character.new(user: user).valid?
  end

  test "状態に対応する画像を state の値で探す" do
    CharacterAnimation.create!(state: :sleeping, gif_path: "/characters/sleeping.png")
    character = create_user.create_character!(state: :sleeping)
    assert_equal "/characters/sleeping.png", character.animation.gif_path
  end

  test "8つの状態が enum で使える" do
    assert_equal %w[normal sleeping sleep_deprived full hungry exercising studying fat], Character.states.keys
    assert_equal Character.states, CharacterStateLog.states
    assert_equal Character.states, CharacterAnimation.states
  end
end
