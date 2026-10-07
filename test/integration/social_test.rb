require "test_helper"

# フェーズ7: ユーザー検索・他人のマイページ・フォロー・通知
class SocialTest < ActionDispatch::IntegrationTest
  setup do
    @me = create_user(name: "自分")
    @alice = create_user(name: "ありす", icon: :cat)
    @bob = create_user(name: "ぼぶ")
  end

  test "未ログインは 401" do
    get "/api/v1/users", params: { q: "あ" }
    assert_response :unauthorized
    get "/api/v1/notifications"
    assert_response :unauthorized
    post "/api/v1/users/#{@alice.id}/follow"
    assert_response :unauthorized
  end

  test "検索は名前の部分一致・自分を除く・following 付き。空の q は空の一覧" do
    create_user(name: "ありすの友達")
    @me.active_follows.create!(followed: @alice)

    get "/api/v1/users", params: { q: "ありす" }, headers: auth_headers(@me)
    assert_response :ok
    assert_equal [ "ありす", "ありすの友達" ], json["users"].map { |u| u["name"] }
    assert_equal({ "id" => @alice.id, "name" => "ありす", "icon" => "cat", "following" => true }, json["users"].first)
    assert_equal false, json["users"].last["following"]

    get "/api/v1/users", params: { q: "自分" }, headers: auth_headers(@me)
    assert_empty json["users"]

    get "/api/v1/users", params: { q: "  " }, headers: auth_headers(@me)
    assert_empty json["users"]
  end

  test "検索の % と _ は文字として扱い、20件まで" do
    create_user(name: "100%さん")
    get "/api/v1/users", params: { q: "%" }, headers: auth_headers(@me)
    assert_equal [ "100%さん" ], json["users"].map { |u| u["name"] }

    21.times { |i| create_user(name: "たくさん#{format('%02d', i)}") }
    get "/api/v1/users", params: { q: "たくさん" }, headers: auth_headers(@me)
    assert_equal 20, json["users"].size
  end

  test "他人のマイページは公開範囲の項目だけを返す" do
    @bob.active_follows.create!(followed: @alice)
    @alice.character.update!(state: :hungry, total_points: 640)

    get "/api/v1/users/#{@alice.id}", headers: auth_headers(@me)
    assert_response :ok
    user = json["user"]
    assert_equal %w[id name icon is_self following followers_count followings_count character].sort, user.keys.sort
    assert_equal false, user["is_self"]
    assert_equal false, user["following"]
    assert_equal 1, user["followers_count"]
    assert_equal 0, user["followings_count"]
    assert_equal %w[name state state_label image_path mood total_points].sort, user["character"].keys.sort
    assert_equal "hungry", user["character"]["state"]
    assert_equal 640, user["character"]["total_points"]
    assert_not user.key?("email")
    assert_not user.key?("birthdate")
  end

  test "存在しないユーザーは 404" do
    get "/api/v1/users/0", headers: auth_headers(@me)
    assert_response :not_found
    assert_equal [ "データが見つかりません" ], json["errors"]
  end

  test "フォローすると相手に通知ができ、もう一度フォローしても通知は増えない。外せる" do
    post "/api/v1/users/#{@alice.id}/follow", headers: auth_headers(@me)
    assert_response :ok
    assert_equal({ "following" => true, "followers_count" => 1 }, json)
    assert @me.following?(@alice)

    notification = @alice.notifications.sole
    assert_equal "follow", notification.notification_type
    assert_equal "自分さんにフォローされました", notification.title
    assert_equal @me, notification.actor

    post "/api/v1/users/#{@alice.id}/follow", headers: auth_headers(@me)
    assert_response :ok
    assert_equal 1, @alice.notifications.count

    delete "/api/v1/users/#{@alice.id}/follow", headers: auth_headers(@me)
    assert_response :ok
    assert_equal({ "following" => false, "followers_count" => 0 }, json)
    assert_not @me.following?(@alice)
    assert_equal 1, @alice.notifications.count # 外しても通知は残る

    # 外してからもう一度フォローしたら、また通知する（回数の制限なし）
    post "/api/v1/users/#{@alice.id}/follow", headers: auth_headers(@me)
    assert_equal 2, @alice.notifications.count

    delete "/api/v1/users/#{@bob.id}/follow", headers: auth_headers(@me) # フォローしていなくても成功
    assert_response :ok
  end

  test "自分自身はフォローできない（422）" do
    post "/api/v1/users/#{@me.id}/follow", headers: auth_headers(@me)
    assert_response :unprocessable_entity
    assert_equal [ "自分自身はフォローできません" ], json["errors"]
    assert_equal 0, Notification.count
  end

  test "フォロワー・フォロー中の一覧は自分のものだけ。/me にフォロー数" do
    @me.active_follows.create!(followed: @alice)
    @bob.active_follows.create!(followed: @me)

    get "/api/v1/users/#{@me.id}/followings", headers: auth_headers(@me)
    assert_response :ok
    assert_equal [ [ @alice.id, true ] ], json["users"].map { |u| [ u["id"], u["following"] ] }

    get "/api/v1/users/#{@me.id}/followers", headers: auth_headers(@me)
    assert_equal [ [ @bob.id, false ] ], json["users"].map { |u| [ u["id"], u["following"] ] }

    get "/api/v1/users/#{@alice.id}/followers", headers: auth_headers(@me)
    assert_response :not_found

    get "/api/v1/me", headers: auth_headers(@me)
    assert_equal 1, json.dig("user", "followers_count")
    assert_equal 1, json.dig("user", "followings_count")
  end

  test "通知は新しい順・50件まで。既読にできる。他人の通知は 404" do
    travel_to Time.zone.local(2026, 10, 7, 9) do
      52.times do |i|
        @me.notifications.create!(notification_type: :task, title: "通知#{i}", created_at: Time.current + i.minutes)
      end
    end
    others = @alice.notifications.create!(notification_type: :task, title: "ありすの通知")

    get "/api/v1/notifications", headers: auth_headers(@me)
    assert_response :ok
    assert_equal 50, json["notifications"].size
    assert_equal "通知51", json["notifications"].first["title"]
    assert_equal 52, json["unread_count"]
    assert_equal false, json["notifications"].first["read"]

    target = @me.notifications.find_by!(title: "通知51")
    patch "/api/v1/notifications/#{target.id}/read", headers: auth_headers(@me)
    assert_response :ok
    assert_equal true, json.dig("notification", "read")
    assert_equal 51, json["unread_count"]

    patch "/api/v1/notifications/#{others.id}/read", headers: auth_headers(@me)
    assert_response :not_found
    assert_not others.reload.read?

    post "/api/v1/notifications/read_all", headers: auth_headers(@me)
    assert_response :ok
    assert_equal 0, @me.notifications.unread.count
    assert_equal 1, @alice.notifications.unread.count
  end

  test "フォロー通知には actor（アイコン・名前）が付く" do
    post "/api/v1/users/#{@alice.id}/follow", headers: auth_headers(@me)
    get "/api/v1/notifications", headers: auth_headers(@alice)
    assert_equal({ "id" => @me.id, "name" => "自分", "icon" => @me.icon }, json["notifications"].first["actor"])
  end
end
