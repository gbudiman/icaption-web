class CaptionController < ApplicationController
  def index
  end

  def receiver
    payload = request[:file]
    filename = request[:filename]
    randomizer = Caption.generate_work_id
    target_filepath = "#{randomizer}_#{filename}"

    File.open(Rails.root.join('uploads', target_filepath), 'wb') do |file|
      file.write(payload.read)
    end

    render json: {
      success: true,
      work_id: target_filepath
    }
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
