# frozen_string_literal: true

class CreateSocialProofWidgets < ActiveRecord::Migration[7.1]
  def change
    create_table :social_proof_widgets do |t|
      t.references :user, null: false, foreign_key: true
      
      t.string :name, null: false, limit: 255
      t.boolean :universal, default: false, null: false
      t.text :title
      t.text :description
      t.string :cta_text, limit: 255
      t.string :cta_type, default: "button", null: false
      t.string :image_type, default: "product_thumbnail", null: false
      
      t.integer :flags, default: 0
      t.text :json_data
      
      t.string :external_id, null: false, limit: 191
      t.datetime :deleted_at
      
      t.timestamps
      
      t.index :external_id, unique: true
      t.index [:user_id, :universal]
      t.index :deleted_at
    end
  end
end
