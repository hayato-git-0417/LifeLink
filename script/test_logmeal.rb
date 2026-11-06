
require "json"
require "pathname"

photo_path = ARGV[0]

unless photo_path && File.file?(photo_path)
  abort "画像ファイルが見つかりません。画像のパスを指定してください。"
end

photo_file = File.open(photo_path, "rb")

begin
  photo = ActionDispatch::Http::UploadedFile.new(
    tempfile: photo_file,
    filename: File.basename(photo_path),
    type: Marcel::MimeType.for(Pathname.new(photo_path))
  )

  response = MealScanner::LogmealClient.new.recognize(photo)

  output_path = Rails.root.join("tmp", "logmeal_response.json")
  File.write(output_path, JSON.pretty_generate(response))

  puts "API呼び出し成功"
  puts "保存先: #{output_path}"
  puts "imageId: #{response["imageId"]}"
  puts "segmentation_results 件数: #{response.fetch("segmentation_results", []).size}"

rescue StandardError => e
  warn "エラー: #{e.class}: #{e.message}"
  exit 1
ensure
  photo_file.close unless photo_file.closed?
end
