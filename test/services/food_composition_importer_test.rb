require "test_helper"
require "csv"
require "tempfile"

class FoodCompositionImporterTest < ActiveSupport::TestCase
  test "CSVを登録し、再実行時は同じ食品コードを更新する" do
    Tempfile.create([ "food-composition", ".csv" ], encoding: "UTF-8") do |file|
      CSV.open(file.path, "w", write_headers: true, headers: FoodCompositionImporter::HEADERS) do |csv|
        csv << [ "01001", "ごはん", "156", "2.5", "0.3", "37.1", "1.5" ]
      end

      assert_equal 1, FoodCompositionImporter.call(file_path: file.path)
      assert_equal 1, FoodCompositionImporter.call(file_path: file.path)
      assert_equal 1, FoodComposition.count
      assert_equal 156, FoodComposition.find_by!(food_code: "01001").calories
    end
  end
end
