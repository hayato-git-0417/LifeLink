require "test_helper"

class PublicAvatarTest < ActionDispatch::IntegrationTest
  setup do
    @me = create_user(name: "自分")
    @friend = create_user(name: "フレンド")
    @friend.avatar.attach(
      io: File.open(file_fixture("meal.png")),
      filename: "friend.png",
      content_type: "image/png"
    )
    @friend.update!(avatar_selected: true)
  end

  test "friend avatar is returned for profile, list, and notification actor" do
    get "/api/v1/users/#{@friend.id}", headers: auth_headers(@me)
    assert_response :ok
    assert_equal true, json.dig("user", "avatar_selected")
    assert json.dig("user", "avatar_url").present?

    @me.active_follows.create!(followed: @friend)
    get "/api/v1/users/#{@me.id}/followings", headers: auth_headers(@me)
    assert_response :ok
    assert_equal true, json.dig("users", 0, "avatar_selected")
    assert json.dig("users", 0, "avatar_url").present?

    @me.notifications.create!(notification_type: :follow, title: "フレンドの通知", actor: @friend)
    get "/api/v1/notifications", headers: auth_headers(@me)
    assert_response :ok
    assert_equal true, json.dig("notifications", 0, "actor", "avatar_selected")
    assert json.dig("notifications", 0, "actor", "avatar_url").present?
  end
end
