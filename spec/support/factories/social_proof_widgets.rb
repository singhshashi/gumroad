# frozen_string_literal: true

FactoryBot.define do
  factory :social_proof_widget do
    association :user
    sequence(:name) { |n| "Social Proof Widget #{n}" }
    widget_type { "purchases" }
    title { "Don't miss out!" }
    message_end { "Join them and get this product today!" }
    cta_text { "Buy Now" }
    cta_type { "button" }
    image_type { "icon" }
    icon_name { "cart3-fill" }
    icon_color { "#059669" }
    universal { false }
    enabled { true }
  end
end
