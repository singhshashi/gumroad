# frozen_string_literal: true


class SocialProofWidget < ApplicationRecord
  include Deletable
  include ExternalId
  include JsonData
  include TimestampScopes
  include FlagShihTzu

  has_flags 1 => :enabled,
            :column => "flags",
            :flag_query_mode => :bit_operator,
            check_for_column: false

  belongs_to :user
  has_and_belongs_to_many :links, join_table: "social_proof_widgets_links"
  
  # Attribution relationships
  has_many :social_proof_widget_attributions, dependent: :destroy
  has_many :attributed_purchases, through: :social_proof_widget_attributions, source: :purchase

  validates :name, presence: true, length: { maximum: 255 }
  validates :cta_type, inclusion: { in: %w[button link none] }
  validates :image_type, inclusion: {
    in: %w[
      product_thumbnail
      custom_image
      icon
      none
    ]
  }
  validates :widget_type, inclusion: { in: %w[purchases memberships] }
  validates :title, length: { maximum: 50 }
  validates :message_end, length: { maximum: 200 }
  validates :cta_text, length: { maximum: 255 }
  validates :icon_name, presence: true, if: :icon_type?

  validate :custom_image_presence
  validate :icon_presence

  scope :alive, -> { where(deleted_at: nil) }
  scope :universal, -> { where(universal: true) }
  scope :product_specific, -> { where(universal: false) }
  scope :enabled_widgets, -> { alive.enabled }
  scope :purchases_widgets, -> { where(widget_type: 'purchases') }
  scope :memberships_widgets, -> { where(widget_type: 'memberships') }

  attr_json_data_accessor :custom_image_url, default: -> { nil }
  attr_json_data_accessor :icon_name, default: -> { nil }
  attr_json_data_accessor :icon_color, default: -> { "#059669" }
  attr_json_data_accessor :analytics_data, default: -> { {} }

  # Cookie constants (following affiliate pattern)
  SOCIAL_PROOF_COOKIE_NAME_PREFIX = "_gumroad_social_proof_"

  before_validation :set_defaults, on: :create
  before_save :unpublish_if_content_changed

  def icon_type?
    image_type == "icon"
  end

  def custom_image?
    image_type == "custom_image"
  end

  def product_thumbnail?
    image_type == "product_thumbnail"
  end

  def has_cta?
    cta_type != "none"
  end

  def button_cta?
    cta_type == "button"
  end

  def link_cta?
    cta_type == "link"
  end

  def purchases_widget?
    widget_type == 'purchases'
  end

  def memberships_widget?
    widget_type == 'memberships'
  end


  def generate_widget_data_for_product(product)
    case widget_type
    when 'purchases'
      {
        title: title,
        message_end: message_end,
        cta_text: cta_text,
        number: purchases_last_24h(product),
        number_text: "purchases in the last 24 hours"
      }
    when 'memberships'
      {
        title: title,
        message_end: message_end,
        cta_text: cta_text,
        number: total_memberships(product),
        number_text: "total members"
      }
    end
  end

  def widgets_for_product(product)
    user_widgets = product.user.social_proof_widgets.enabled_widgets
    universal_widgets = user_widgets.universal
    product_specific_widgets = user_widgets.product_specific.joins(:links).where(links: { id: product.id })

    product_specific_widgets.presence || universal_widgets.limit(1)
  end

  def purchases_last_24h(product)
    product.sales
           .where(state: Purchase::ALL_SUCCESS_STATES)
           .where(created_at: 24.hours.ago..)
           .count
  end

  def total_memberships(product)
    # Count active subscriptions for this product
    product.subscriptions
           .active
           .count
  end

  def increment_impression!
    analytics_data = self.analytics_data || {}
    analytics_data["impressions"] = (analytics_data["impressions"] || 0) + 1
    self.analytics_data = analytics_data
    save!
  end

  def increment_click!
    analytics_data = self.analytics_data || {}
    analytics_data["clicks"] = (analytics_data["clicks"] || 0) + 1
    self.analytics_data = analytics_data
    save!
  end

  def increment_close!
    analytics_data = self.analytics_data || {}
    analytics_data["closes"] = (analytics_data["closes"] || 0) + 1
    self.analytics_data = analytics_data
    save!
  end

  def conversion_rate
    impressions = analytics_data["impressions"] || 0
    clicks = analytics_data["clicks"] || 0

    return 0 if impressions == 0

    (clicks.to_f / impressions.to_f * 100).round(2)
  end

  # Cookie management methods (following affiliate pattern)
  def cookie_key
    "#{SOCIAL_PROOF_COOKIE_NAME_PREFIX}#{external_id}"
  end

  def self.cookie_lifetime
    30.days # Attribution window
  end

  # Revenue calculation methods (only count confirmed attributions)
  def total_attributed_revenue_cents
    social_proof_widget_attributions.confirmed.successful_purchases.sum(:attributed_amount_cents)
  end

  def total_attributed_revenue
    Money.new(total_attributed_revenue_cents, "USD")
  end

  def attributed_purchases_count
    social_proof_widget_attributions.confirmed.successful_purchases.count
  end

  def publish!
    update!(enabled: true)
  end

  def duplicate!
    duplicated_widget = self.class.new(
      user: user,
      name: "#{name} (copy)",
      universal: universal,
      widget_type: widget_type,
      title: title,
      message_end: message_end,
      cta_text: cta_text,
      cta_type: cta_type,
      image_type: image_type,
      custom_image_url: custom_image_url,
      icon_name: icon_name,
      icon_color: icon_color,
      enabled: false
    )

    duplicated_widget.save!

    # Copy link associations for non-universal widgets
    unless universal?
      duplicated_widget.links = links
    end

    duplicated_widget
  end

  private
    def set_defaults
      self.enabled = false if enabled.nil?
      self.widget_type ||= "purchases"
      self.cta_type ||= "none"
      self.image_type ||= "none"
    end

    def unpublish_if_content_changed
      return if new_record?
      return unless enabled?

      # Define content fields that should trigger unpublishing when changed
      content_fields = %w[
        name widget_type title message_end cta_text cta_type image_type
        custom_image_url icon_name icon_color universal
      ]

      # Check if any content fields have changed
      content_changed = content_fields.any? { |field| changed.include?(field) }

      # Check if link associations have changed (for non-universal widgets)
      links_changed = changed.include?("universal") ||
                     (respond_to?(:link_ids_changed?) && link_ids_changed?)

      # Unpublish if content or links changed
      if content_changed || links_changed
        self.enabled = false
      end
    end



    def custom_image_presence
      return unless custom_image?

      if custom_image_url.blank?
        errors.add(:custom_image_url, "must be present when using custom image type")
      end
    end

    def icon_presence
      return unless icon_type?

      if icon_name.blank?
        errors.add(:icon_name, "must be present when using icon type")
      end
    end

end
