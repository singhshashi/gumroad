# frozen_string_literal: true

class SocialProofWidgetAttribution < ApplicationRecord
  belongs_to :social_proof_widget
  belongs_to :purchase

  validates :purchase_id, uniqueness: true # One widget per purchase
  validates :attributed_amount_cents, presence: true, numericality: { greater_than: 0 }
  validates :attribution_status, inclusion: { in: %w[pending confirmed rejected] }

  scope :successful_purchases, -> { joins(:purchase).where(purchases: { purchase_state: Purchase::ALL_SUCCESS_STATES }) }
  scope :confirmed, -> { where(attribution_status: "confirmed") }
  scope :pending, -> { where(attribution_status: "pending") }
  scope :rejected, -> { where(attribution_status: "rejected") }

  def attributed_amount
    currency = if purchase[:displayed_price_currency_type].present?
                 purchase[:displayed_price_currency_type].to_s.upcase
               else
                 "USD"
    end
    Money.new(attributed_amount_cents, currency)
  end

  def pending?
    attribution_status == "pending"
  end

  def confirmed?
    attribution_status == "confirmed"
  end

  def rejected?
    attribution_status == "rejected"
  end
end
