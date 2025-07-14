# frozen_string_literal: true

class SocialProofWidgetAttributionService
  ATTRIBUTION_WINDOW = 10.days

  def self.validate_attribution(attribution)
    return unless attribution.pending?

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
      return false unless attribution.purchase.successful?
      return false unless within_attribution_window?(attribution)
      return false unless product_matches?(attribution)
      return false unless seller_matches?(attribution)

      true
    end

    def self.within_attribution_window?(attribution)
      # Check if purchase happened within attribution window from when cookie was set
      return false unless attribution.cookie_set_at.present?

      time_since_cookie = attribution.purchase.created_at - attribution.cookie_set_at
      time_since_cookie <= ATTRIBUTION_WINDOW
    end

    def self.product_matches?(attribution)
      # Check if the widget is configured for the purchased product
      widget = attribution.social_proof_widget
      purchased_product = attribution.purchase.link

      # If widget applies to all products, it's valid
      return true if widget.universal?

      # Check if purchased product is in widget's product list
      widget.links.include?(purchased_product)
    end

    def self.seller_matches?(attribution)
      # Check if widget belongs to the same seller as the purchase
      widget_seller = attribution.social_proof_widget.user
      purchase_seller = attribution.purchase.seller

      widget_seller == purchase_seller
    end

    def self.determine_rejection_reason(attribution)
      return "purchase_failed" unless attribution.purchase.successful?
      return "attribution_window_expired" unless within_attribution_window?(attribution)
      return "product_mismatch" unless product_matches?(attribution)
      return "seller_mismatch" unless seller_matches?(attribution)

      "unknown"
    end
end
