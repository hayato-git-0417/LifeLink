require "test_helper"

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
