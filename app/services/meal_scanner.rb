# 食事の写真から料理名・栄養値を出す「スキャン」（spec.md 6章）。
# 使う API（費用・API キーの管理を含む）が決まるまでは何もしない。今は常に nil を返す。
# 将来は { content:, calories:, protein_g:, fat_g:, carbs_g:, fiber_g: } を返す想定。
#   MealScanner.call(photo: uploaded_file) # => nil
class MealScanner
  def self.call(photo:)
    new(photo: photo).call
  end

  def initialize(photo:)
    @photo = photo
  end

  def call
    nil
  end
end
