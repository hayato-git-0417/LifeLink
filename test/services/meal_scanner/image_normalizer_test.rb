require "test_helper"
require "stringio"

class MealImageNormalizerTest < ActiveSupport::TestCase
  def image(width, height, bands: 3)
    Vips::Image.black(width, height, bands: bands).copy(interpretation: :srgb)
  end

  def normalize(bytes)
    MealScanner::ImageNormalizer.with_upload(StringIO.new(bytes)) do |upload|
      upload.rewind
      data = upload.read
      yield Vips::Image.new_from_buffer(data, ""), data
    end
  end

  test "大きな写真を768pxまで落とさず1536pxで保つ" do
    normalize(image(2400, 1600).write_to_buffer(".jpg", strip: true)) do |converted, bytes|
      assert_equal [1536, 1024], [converted.width, converted.height]
      assert_operator bytes.bytesize, :<, MealScanner::ImageNormalizer::MAX_IMAGE_BYTES
    end
  end

  test "条件を満たすメタデータなしJPEGを再圧縮しない" do
    original = image(1200, 900).write_to_buffer(".jpg", Q: 92, strip: true)
    normalize(original) do |converted, bytes|
      assert_equal [1200, 900], [converted.width, converted.height]
      assert_equal original, bytes
    end
  end

  test "透明PNGは白背景のJPEGに変換する" do
    normalize(image(400, 300, bands: 4).write_to_buffer(".png")) do |converted, bytes|
      assert bytes.start_with?("\xFF\xD8".b)
      assert_equal 3, converted.bands
      assert converted.getpoint(0, 0).all? { |value| value >= 250 }
    end
  end

  test "スマホのEXIF方向に従って回転しメタデータを残さない" do
    photo = image(1000, 500)
    photo.set_type(GObject::GINT_TYPE, "orientation", 6)
    normalize(photo.write_to_buffer(".jpg")) do |converted, _bytes|
      assert_equal [500, 1000], [converted.width, converted.height]
      assert_not converted.get_fields.any? { |field| field.start_with?("exif") }
    end
  end
end
