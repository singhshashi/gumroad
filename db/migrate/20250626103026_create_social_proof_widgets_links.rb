# frozen_string_literal: true

class CreateSocialProofWidgetsLinks < ActiveRecord::Migration[7.1]
  def change
    create_table :social_proof_widgets_links do |t|
      t.references :social_proof_widget, null: false, foreign_key: true
      t.references :link, null: false, foreign_key: true

      t.timestamps

      t.index [:social_proof_widget_id, :link_id], unique: true, name: "index_social_proof_widgets_links_unique"
      t.index [:link_id, :social_proof_widget_id], name: "index_social_proof_widgets_links_reverse"
    end
  end
end
