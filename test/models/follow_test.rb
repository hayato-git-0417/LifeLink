require "test_helper"

class FollowTest < ActiveSupport::TestCase
  setup do
    @alice = create_user
    @bob = create_user
  end

  test "自分自身はフォローできない" do
    follow = Follow.new(follower: @alice, followed: @alice)
    assert_not follow.valid?
    assert follow.errors.of_kind?(:base, :self_follow)
  end

  test "同じ人を二重にフォローできない" do
    Follow.create!(follower: @alice, followed: @bob)
    assert_not Follow.new(follower: @alice, followed: @bob).valid?
  end

  test "逆向きのフォローはできる" do
    Follow.create!(follower: @alice, followed: @bob)
    assert Follow.new(follower: @bob, followed: @alice).valid?
  end
end
