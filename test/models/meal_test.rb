require "test_helper"

class MealTest < ActiveSupport::TestCase
  setup do
    @user = create_user
  end

  test "集計日は食べた日（日本時間）。入力方法の既定は手入力" do
    meal = @user.meals.create!(meal_type: :breakfast, eaten_at: Time.zone.local(2026, 10, 6, 7, 30), calories: 500)
    assert_equal Date.new(2026, 10, 6), meal.recorded_on
    assert meal.manual?
  end

  test "食べた時間を直すと集計日も変わる" do
    meal = @user.meals.create!(meal_type: :dinner, eaten_at: Time.zone.local(2026, 10, 5, 19))
    meal.update!(eaten_at: Time.zone.local(2026, 10, 6, 0, 30))
    assert_equal Date.new(2026, 10, 6), meal.recorded_on
  end

  test "栄養値はマイナス不可、未入力は可" do
    assert_not @user.meals.build(meal_type: :lunch, eaten_at: Time.current, protein_g: -1).valid?
    assert @user.meals.build(meal_type: :lunch, eaten_at: Time.current).valid?
  end

  test "写真を添付できる" do
    meal = @user.meals.create!(meal_type: :snack, eaten_at: Time.current)
    meal.photo.attach(io: StringIO.new("dummy"), filename: "meal.jpg", content_type: "image/jpeg")
    assert meal.photo.attached?
  end
end
