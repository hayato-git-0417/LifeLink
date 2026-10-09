require "test_helper"

class MealScannerTest < ActiveSupport::TestCase
  test "スキャンは未実装なので nil を返す" do
    assert_nil MealScanner.call(photo: nil)
  end
end
