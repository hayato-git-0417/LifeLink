# Source: MHLW Dietary Reference Intakes for Japanese (2025), pp.376-382.
# https://www.mhlw.go.jp/content/10904750/001316585.pdf
class ChildNutritionStandards
  ROWS = {
    male: [[1, 2, 950, 20, 0], [3, 5, 1300, 25, 8], [6, 7, 1550, 30, 10],
           [8, 9, 1850, 40, 11], [10, 11, 2250, 45, 13], [12, 14, 2600, 60, 17], [15, 17, 2850, 65, 19]],
    female: [[1, 2, 900, 20, 0], [3, 5, 1250, 25, 8], [6, 7, 1450, 30, 9],
             [8, 9, 1700, 40, 11], [10, 11, 2100, 50, 13], [12, 14, 2400, 55, 16], [15, 17, 2300, 55, 18]]
  }.freeze

  def self.call
    ROWS.each do |gender, rows|
      rows.each do |from, to, calories, protein, fiber|
        standard = NutritionStandard.find_or_initialize_by(gender: gender, age_from: from, activity_level: :moderate)
        standard.update!(age_to: to, calories: calories, protein_g: protein, fiber_g: fiber,
                         fat_g: (calories * 0.25 / 9).round(1), carbs_g: (calories * 0.575 / 4).round(1))
      end
    end
  end
end
