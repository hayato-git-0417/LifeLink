require "csv"
require "fileutils"
require "json"

group = ENV.fetch("SCAN_GROUP", "tune")
abort "SCAN_GROUPはtuneまたはcheckを指定してください" unless %w[tune check].include?(group)
replay = ENV["SCAN_REPLAY"].presence
label = ENV.fetch("SCAN_LABEL", replay ? "replay" : "")
abort "SCAN_LABELは半角英数字・_・-だけで指定してください" unless label.match?(/\A[a-zA-Z0-9_-]*\z/)
root = Rails.root.join("test_images", group)
suffix = label.empty? ? "" : "_#{label}"
output = Rails.root.join("tmp", "meal_scans_#{group}#{suffix}.csv")
abort "再集計元を上書きしないよう別のSCAN_LABELを指定してください" if replay && File.expand_path(replay) == output.to_s
summary_path = Rails.root.join("tmp", "meal_scans_#{group}#{suffix}_summary.json")
truth_path = ENV["SCAN_TRUTH_FILE"].presence || root.join("nutrition_truth.csv")
references = File.file?(truth_path) ? CSV.read(truth_path, headers: true).to_h { |row| [row.fetch("path"), row.to_h] } : {}
warn "正解の栄養値がないため誤差は計算しません: #{truth_path}" if references.empty?

keys = MealNutritionEstimate::KEYS
headers = %w[group truth filename category authenticity confidence decision error content] + keys.map(&:to_s) + keys.map { |key| "raw_#{key}" } + %w[nutrition_warning portion_estimates_json raw_components_json model_used input_image_bytes]
headers += keys.flat_map { |key| %W[reference_#{key} error_#{key} absolute_error_#{key} percentage_error_#{key}] }
FileUtils.mkdir_p(output.dirname)

def scan_decision(result)
  return "拒否" unless result[:category] == "real_common_food" && result[:authenticity] != "likely_imitation" && result[:content].present?
  return "拒否" if result.fetch(:confidence) < OpenaiMealScanner::MIN_CONFIDENCE
  result.fetch(:confidence) < OpenaiMealScanner::NORMAL_CONFIDENCE ? "注意表示" : "通常表示"
end

# SCAN_REPLAYを使うと、保存済みの結果に正解値を追加してAPIを呼ばずに再集計できる。
inputs = if replay
  CSV.read(replay, headers: true).map { |row| { truth: row["truth"], filename: row["filename"], saved: row.to_h } }
else
  %w[real sample].flat_map do |truth|
    folder = root.join(truth)
    unless folder.directory?
      warn "フォルダがありません: #{folder}"
      next []
    end
    folder.children.select { |path| path.file? && path.extname.match?(/\A\.(jpg|jpeg|png|webp)\z/i) }.sort.map { |path| { truth: truth, filename: path.basename.to_s, path: path } }
  end
end
comparisons = []
raw_comparisons = []
CSV.open(output, "w", write_headers: true, headers: headers) do |csv|
  inputs.each do |input|
    truth, filename = input.values_at(:truth, :filename)
    reference = references.fetch("#{truth}/#{filename}", {})
    record = { "group" => group, "truth" => truth, "filename" => filename }
    begin
      if input[:saved]
        record.merge!(input[:saved].slice(*headers))
        record["group"] = group
        estimate = keys.index_with { |key| MealNutritionAccuracy.number(record[key.to_s]) }
        raw = keys.index_with { |key| MealNutritionAccuracy.number(record["raw_#{key}"]) }
      else
        puts "解析中: #{group}/#{truth}/#{filename}"
        mime = { ".png" => "image/png", ".webp" => "image/webp" }.fetch(input[:path].extname.downcase, "image/jpeg")
        result = File.open(input[:path], "rb") do |file|
          upload = ActionDispatch::Http::UploadedFile.new(tempfile: file, filename: filename, type: mime)
          MealScanner::ImageNormalizer.with_upload(upload) do |photo|
            OpenaiMealScanner.call(photo: photo, evaluation: true, content_hint: reference["content_hint"], model: ENV["SCAN_MODEL"])
          end
        end
        decision = scan_decision(result)
        estimate = keys.index_with { |key| decision == "拒否" ? nil : result[key] }
        raw = result[:raw_nutrients] || {}
        record.merge!("category" => result[:category], "authenticity" => result[:authenticity], "confidence" => result[:confidence], "decision" => decision,
                      "error" => "", "content" => result[:content], "nutrition_warning" => result[:nutrition_warning],
                      "portion_estimates_json" => JSON.generate(result[:portion_estimates] || []), "raw_components_json" => JSON.generate(result[:raw_components] || []),
                      "model_used" => result[:model_used], "input_image_bytes" => result[:input_image_bytes])
        keys.each { |key| record[key.to_s] = estimate[key]; record["raw_#{key}"] = raw[key] }
      end
    rescue StandardError => error
      warn "エラー: #{error.class}: #{error.message}"
      record.merge!("decision" => "エラー", "error" => "#{error.class}: #{error.message}")
      estimate = {}
      raw = {}
    end
    comparison = MealNutritionAccuracy.compare(estimate, reference)
    comparisons << comparison
    raw_comparisons << MealNutritionAccuracy.compare(raw, reference)
    keys.each do |key|
      %i[reference error absolute_error percentage_error].each { |metric| record["#{metric}_#{key}"] = comparison[key][metric] }
    end
    csv << headers.map { |header| record[header] }
    csv.flush
  end
end
File.write(summary_path, JSON.pretty_generate({ group: group, label: label, mode: replay ? "replay" : "live", photos: inputs.size,
                                             nutrients: MealNutritionAccuracy.summary(comparisons), raw_nutrients: MealNutritionAccuracy.summary(raw_comparisons) }))
puts "結果: #{output}"
puts "誤差・過大過小の傾向・取得率: #{summary_path}"
