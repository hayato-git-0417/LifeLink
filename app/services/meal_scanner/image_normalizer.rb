
require "tempfile"
require "vips"

class MealScanner::ImageNormalizer
  MAX_IMAGE_BYTES = 2 * 1024 * 1024
  MAX_INPUT_BYTES = 30 * 1024 * 1024
  MAX_SIDE = 1536

  # 変換した画像をブロックに渡し、終了後に一時ファイルを削除する
  def self.with_upload(photo)
    raise ArgumentError, "画像が選択されていません" if photo.nil?

    Tempfile.create(["meal-original", ".bin"]) do |original|
      original.binmode

      source = photo.respond_to?(:tempfile) ? photo.tempfile : photo
      raise ArgumentError, "画像を読み込めません" unless source.respond_to?(:read)

      source.rewind if source.respond_to?(:rewind)

      total_size = 0

      while (chunk = source.read(1024 * 1024))
        total_size += chunk.bytesize

        if total_size > MAX_INPUT_BYTES
          raise ArgumentError, "画像が大きすぎます（30MB以下にしてください）"
        end

        original.write(chunk)
      end

      raise ArgumentError, "画像が空です" if total_size.zero?

      original.flush

      bytes = File.binread(original.path)
      source_image = Vips::Image.new_from_buffer(bytes, "")
      # Canvasなどで既に整えたJPEGは、再エンコードによる画質低下を避ける。
      # EXIF/GPS等を含む画像は通常どおり変換・メタデータ削除を行う。
      if reusable_jpeg?(bytes, source_image)
        jpeg_data = bytes
      else
        image = Vips::Image.thumbnail_buffer(bytes, MAX_SIDE, height: MAX_SIDE, size: :down)
        image = image.colourspace(:srgb)
        image = image.flatten(background: [255, 255, 255]) if image.has_alpha?
        jpeg_data = compress(image)
      end

      Tempfile.create(["meal-logmeal", ".jpg"]) do |converted|
        converted.binmode
        converted.write(jpeg_data)
        converted.flush
        converted.rewind

        # 元のファイル名や形式に依存しないアップロード
        upload = ActionDispatch::Http::UploadedFile.new(
          tempfile: converted,
          filename: "meal.jpg",
          type: "image/jpeg"
        )

        yield upload
      end
    end
  rescue Vips::Error => e
    Rails.logger.warn(
      "[MealScanner] 画像変換エラー: #{e.class}: #{e.message}"
    )

    raise ArgumentError,
          "画像を変換できませんでした。対応する画像形式か確認してください。"
  end

  def self.reusable_jpeg?(bytes, image)
    fields = image.get_fields
    upright = !fields.include?("orientation") || image.get("orientation").to_i == 1
    bytes.start_with?("\xFF\xD8".b) && bytes.bytesize < MAX_IMAGE_BYTES &&
      [image.width, image.height].max <= MAX_SIDE && image.bands == 3 && image.interpretation == :srgb &&
      upright && fields.none? { |field| field.match?(/\A(?:exif|xmp|iptc|icc)/i) }
  end

  def self.compress(image)
    quality = 90

    25.times do
      data = image.write_to_buffer(
        ".jpg",
        Q: quality,
        strip: true
      )

      return data if data.bytesize < MAX_IMAGE_BYTES

      if quality > 55
        quality -= 10
      else
        image = image.resize(0.8)
        quality = 80
      end
    end

    raise ArgumentError, "画像を2MB未満に圧縮できませんでした"
  end

  private_class_method :compress, :reusable_jpeg?
end
