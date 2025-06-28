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
      image_type_options: image_type_options,
      cta_type_options: cta_type_options,
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
      enabled: widget.enabled?,
      icon_class: widget.icon_class,
      created_at: widget.created_at.iso8601,
      updated_at: widget.updated_at.iso8601,
      products: widget.universal? ? nil : widget.links.visible_and_not_archived.map do |product|
        {
          id: product.external_id,
          name: product.name,
          url: product.long_url,
          thumbnail_url: product.thumbnail_or_cover_url,
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
      impressions: analytics_data['impressions'] || 0,
      clicks: analytics_data['clicks'] || 0,
      closes: analytics_data['closes'] || 0,
      conversion_rate: widget.conversion_rate,
      products_count: widget.universal? ? pundit_user.seller.products.visible_and_not_archived.count : widget.links.visible_and_not_archived.count,
      created_at: widget.created_at.iso8601,
    }
  end

  private

  def widget_analytics_summary(widget)
    analytics_data = widget.analytics_data || {}
    
    {
      impressions: analytics_data['impressions'] || 0,
      clicks: analytics_data['clicks'] || 0,
      closes: analytics_data['closes'] || 0,
      conversion_rate: widget.conversion_rate,
    }
  end

  def image_type_options
    [
      { id: 'product_thumbnail', label: 'Product Thumbnail' },
      { id: 'custom_image', label: 'Custom Image' },
      { id: 'icon_solid_fire', label: 'Fire Icon' },
      { id: 'icon_solid_heart', label: 'Heart Icon' },
      { id: 'icon_patch_check_fill', label: 'Check Icon' },
      { id: 'icon_cart3_fill', label: 'Cart Icon' },
      { id: 'icon_solid_users', label: 'Users Icon' },
      { id: 'icon_star_fill', label: 'Star Icon' },
      { id: 'icon_solid_sparkles', label: 'Sparkles Icon' },
      { id: 'icon_clock_fill', label: 'Clock Icon' },
      { id: 'icon_solid_gift', label: 'Gift Icon' },
      { id: 'icon_solid_lightning_bolt', label: 'Lightning Icon' },
    ]
  end

  def cta_type_options
    [
      { id: 'button', label: 'Button' },
      { id: 'link', label: 'Link' },
      { id: 'none', label: 'No CTA' },
    ]
  end

  def pagination_props
    return nil unless pagination
    
    {
      pages: pagination.pages,
      page: pagination.page,
    }
  end
end