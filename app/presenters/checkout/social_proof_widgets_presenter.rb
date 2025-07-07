# frozen_string_literal: true

class Checkout::SocialProofWidgetsPresenter
  include CheckoutDashboardHelper

  attr_reader :pundit_user, :widgets, :pagination

  def initialize(pundit_user:, widgets: [], pagination: nil)
    @pundit_user = pundit_user
    @widgets = widgets
    @pagination = pagination
  end

  def social_proof_widgets_props
    {
      pages: pages,
      pagination: pagination_props,
      widgets: widgets.map { widget_props(_1) },
      products: pundit_user.seller.products.visible_and_not_archived.map do |product|
        {
          id: product.external_id,
          name: product.name,
          url: product.long_url,
          thumbnail_url: product.thumbnail_or_cover_url,
          sales_count: product.successful_sales_count,
        }
      end,
    }
  end

  def widget_props(widget)
    {
      id: widget.external_id,
      can_update: Pundit.policy!(pundit_user, [:checkout, widget]).update?,
      can_destroy: Pundit.policy!(pundit_user, [:checkout, widget]).destroy?,
      name: widget.name,
      universal: widget.universal?,
      title: widget.title,
      description: widget.description,
      cta_text: widget.cta_text,
      cta_type: widget.cta_type,
      image_type: widget.image_type,
      custom_image_url: widget.custom_image_url,
      icon_name: widget.icon_name,
      icon_color: widget.icon_color,
      enabled: widget.enabled?,
      created_at: widget.created_at.iso8601,
      updated_at: widget.updated_at.iso8601,
      products: widget.universal? ? nil : widget.links.visible_and_not_archived.map do |product|
        {
          id: product.external_id,
          name: product.name,
          url: product.long_url,
          thumbnail_url: product.thumbnail_or_cover_url,
          sales_count: product.successful_sales_count,
        }
      end,
      analytics: widget_analytics_summary(widget),
    }
  end

  def widget_analytics_props(widget)
    analytics_data = widget.analytics_data || {}

    {
      id: widget.external_id,
      name: widget.name,
      universal: widget.universal?,
      impressions: analytics_data["impressions"] || 0,
      clicks: analytics_data["clicks"] || 0,
      closes: analytics_data["closes"] || 0,
      conversion_rate: widget.conversion_rate,
      products_count: widget.universal? ? pundit_user.seller.products.visible_and_not_archived.count : widget.links.visible_and_not_archived.count,
      created_at: widget.created_at.iso8601,
    }
  end

  def pagination_props
    return nil unless pagination

    {
      pages: pagination.pages,
      page: pagination.page,
    }
  end

  private
    def widget_analytics_summary(widget)
      analytics_data = widget.analytics_data || {}

      {
        impressions: analytics_data["impressions"] || 0,
        clicks: analytics_data["clicks"] || 0,
        closes: analytics_data["closes"] || 0,
        conversion_rate: widget.conversion_rate,
      }
    end
end
