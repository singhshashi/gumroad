# frozen_string_literal: true

class SocialProofWidgetAttributionService
  ATTRIBUTION_WINDOW = 10.days

  def self.validate_attribution(attribution)
    return if !attribution.pending?

    if valid_attribution?(attribution)
      attribution.update!(attribution_status: "confirmed")
    else
      attribution.update!(
        attribution_status: "rejected",
        rejection_reason: determine_rejection_reason(attribution)
      )
    end
  rescue StandardError => e
    Rails.logger.error "Attribution validation failed: #{e.message}"
    # Keep as pending for retry
  end

  private
    def self.valid_attribution?(attribution)
      return false if !attribution.purchase.successful?
      return false if !within_attribution_window?(attribution)
      return false if !product_matches?(attribution)
      return false if !seller_matches?(attribution)

      true
    end

    def self.within_attribution_window?(attribution)
      # Check if purchase happened within attribution window from when cookie was set
      return false if !attribution.cookie_set_at.present?

      time_since_cookie = attribution.purchase.created_at - attribution.cookie_set_at
      time_since_cookie <= ATTRIBUTION_WINDOW
    end

    def self.product_matches?(attribution)
      # Check if the widget is configured for the purchased product
      widget = attribution.social_proof_widget
      purchased_product = attribution.purchase.link

      return true if widget.universal?

      widget.links.include?(purchased_product)
    end

    def self.seller_matches?(attribution)
      widget_seller = attribution.social_proof_widget.user
      purchase_seller = attribution.purchase.seller

      widget_seller == purchase_seller
    end

    def self.determine_rejection_reason(attribution)
      return "purchase_failed" if !attribution.purchase.successful?
      return "attribution_window_expired" if !within_attribution_window?(attribution)
      return "product_mismatch" if !product_matches?(attribution)
      return "seller_mismatch" if !seller_matches?(attribution)

      "unknown"
    end
end
