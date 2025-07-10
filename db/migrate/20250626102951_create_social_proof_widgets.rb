# frozen_string_literal: true

class CreateSocialProofWidgets < ActiveRecord::Migration[7.1]
  def change
    create_table :social_proof_widgets do |t|
      t.references :user, null: false, foreign_key: true
      
      t.string :name, null: false, limit: 255
      t.boolean :universal, default: false, null: false
      t.string :widget_type, default: 'purchases', null: false
      t.text :title, limit: 50
      t.text :message_start, limit: 200
      t.text :message_end, limit: 200
      t.string :cta_text, limit: 255
      t.string :cta_type, default: 'none', null: false
      t.string :image_type, default: 'none', null: false
      
      t.integer :flags, default: 0
      t.text :json_data
      
      t.datetime :deleted_at
      
      t.timestamps
      t.index [:user_id, :universal]
      t.index :deleted_at
    end
  end
end
