class Caption < ApplicationRecord
  def self.generate_work_id
    t = Time.now.to_i
    r = srand
    return "#{t}_#{r}"
  end
end
