# frozen_string_literal: true

FactoryBot.define do
  factory :social_proof_widget_attribution do
    association :social_proof_widget
    association :purchase
    attributed_amount_cents { 1000 }
  end
end
