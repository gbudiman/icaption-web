class CaptionController < ApplicationController
  def index
  end

  def receiver
    payload = request[:file]
    filename = request[:filename].gsub(/[^0-9A-Za-z.\-]/, '_').gsub(/jpeg/, 'jpg') #.gsub(/\s/, '')
    topic_id = request[:topic_id].to_i

    randomizer = Caption.generate_work_id
    target_filepath = "#{randomizer}_#{filename}"
    rel_path = Rails.root.join('uploads', target_filepath)

    File.open(rel_path, 'wb') do |file|
      file.write(payload.read)
    end

    rel_path = check_format path: rel_path
    py_script = '/home/gbudiman/Documents/icaption/im2txt/topic_caption_scripts/generate_caption_integrated.sh'
    sh_cmd = "sh #{py_script} #{rel_path} #{topic_id} &"

    ap sh_cmd
    system sh_cmd

    render json: {
      success: true,
      work_id: File.basename(rel_path),
      topic_id: topic_id
    }
  end

  def check_format path:
    img = Magick::Image::read(path).first
    sliced = path.to_s.split(/\./)[0..-2].join('.')

    if not img.format.match(/jp[e]?g$/i)
      new_path = "#{sliced}.jpg"
      img.format = "JPG"
      img.write(new_path)
      File.delete(path)
      return new_path.to_s
    end

    return path.to_s
  end

  def ping
    work_id = request[:work_id]
    id = work_id.split(/\./)[0]
    image_file = Rails.root.join('uploads', work_id)
    caption_file = Rails.root.join('captions', id + '.txt')

    if File.exist?(image_file)
      if File.exist?(caption_file)
        render json: {
          status: 'completed',
          result: File.open(caption_file, 'rb') { |f| f.read }
        }
      else
        render json: {
          status: 'pending'
        }
      end
    else
      render json: {
        status: 'invalid'
      }
    end
  end
end
