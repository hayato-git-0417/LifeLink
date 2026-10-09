require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "名前と生年月日があれば作れる。性別とアイコンの既定は未回答・person_blue" do
    user = create_user
    assert user.unspecified?
    assert user.person_blue?
  end

  test "名前は必須で50文字まで" do
    assert_not User.new(email: "a@example.com", password: "password", birthdate: Date.new(2000, 1, 1)).valid?
    user = User.new(email: "a@example.com", password: "password", birthdate: Date.new(2000, 1, 1), name: "あ" * 51)
    assert_not user.valid?
    assert user.errors.of_kind?(:name, :too_long)
  end

  test "生年月日は必須で未来の日付は不可" do
    travel_to Time.zone.local(2026, 10, 6, 12) do
      user = User.new(email: "a@example.com", password: "password", name: "a", birthdate: Date.new(2026, 10, 7))
      assert_not user.valid?
      assert user.errors.of_kind?(:birthdate, :in_future)
    end
  end

  test "存在しない性別・アイコンは enum のエラーになる" do
    user = User.new(email: "a@example.com", password: "password", name: "a", birthdate: Date.new(2000, 1, 1), gender: "unknown", icon: "dog")
    assert_not user.valid?
    assert user.errors.of_kind?(:gender, :inclusion)
    assert user.errors.of_kind?(:icon, :inclusion)
  end

  test "年齢は誕生日の当日に1つ増える" do
    user = User.new(birthdate: Date.new(2006, 10, 13))
    assert_equal 19, user.age(on: Date.new(2026, 10, 12))
    assert_equal 20, user.age(on: Date.new(2026, 10, 13))
  end

  test "フォロー・フォロワーの関連" do
    alice = create_user
    bob = create_user
    Follow.create!(follower: alice, followed: bob)

    assert_equal [ bob ], alice.followings.to_a
    assert_equal [ alice ], bob.followers.to_a
    assert alice.following?(bob)
    assert_not bob.following?(alice)
  end

  test "ユーザーを消すと関連データも消え、送った通知の actor は NULL になる" do
    alice = create_user
    bob = create_user
    Follow.create!(follower: alice, followed: bob)
    notification = bob.notifications.create!(actor: alice, notification_type: :follow, title: "フォローされました")

    alice.destroy!

    assert_equal 0, Character.where(user_id: alice.id).count
    assert_equal 0, Follow.count
    assert_nil notification.reload.actor_id
  end
end
