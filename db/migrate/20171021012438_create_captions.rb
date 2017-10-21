class CreateCaptions < ActiveRecord::Migration[5.1]
  def change
    create_table :captions do |t|

      t.timestamps
    end
  end
end
