ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors, with: :threads)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...

    # テスト用ユーザーを作る（email は呼ぶたびに変える）
    def create_user(**attrs)
      @user_seq = (@user_seq || 0) + 1
      User.create!({
        email: "user#{@user_seq}-#{SecureRandom.hex(4)}@example.com",
        password: "password",
        name: "ユーザー#{@user_seq}",
        birthdate: Date.new(2000, 4, 1)
      }.merge(attrs))
    end
  end
end
