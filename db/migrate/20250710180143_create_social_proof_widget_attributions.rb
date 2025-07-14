# frozen_string_literal: true

class CreateSocialProofWidgetAttributions < ActiveRecord::Migration[7.1]
  def change
    create_table :social_proof_widget_attributions do |t|
      t.references :social_proof_widget, null: false, foreign_key: true
      t.references :purchase, null: false, foreign_key: true
      t.bigint :attributed_amount_cents, null: false
      t.string :attribution_status, default: "pending", null: false
      t.string :rejection_reason
      t.datetime :cookie_set_at

      t.timestamps
    end

    add_index :social_proof_widget_attributions, :attribution_status
  end
end
