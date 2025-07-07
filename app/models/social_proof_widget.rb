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
  validates :title, length: { maximum: 500 }
  validates :description, length: { maximum: 1000 }
  validates :cta_text, length: { maximum: 255 }
  validates :icon_name, presence: true, if: :icon_type?

  validate :universal_widget_limit
  validate :custom_image_presence
  validate :icon_presence
  validate :template_variables_valid
  validate :template_syntax_valid

  scope :alive, -> { where(deleted_at: nil) }
  scope :universal, -> { where(universal: true) }
  scope :product_specific, -> { where(universal: false) }
  scope :enabled_widgets, -> { alive.is_enabled }

  attr_json_data_accessor :custom_image_url, default: -> { nil }
  attr_json_data_accessor :icon_name, default: -> { nil }
  attr_json_data_accessor :icon_color, default: -> { "#000000" }
  attr_json_data_accessor :analytics_data, default: -> { {} }

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

  def process_template_strings(context = {})
    processed_title = process_template_string(title, context)
    processed_description = process_template_string(description, context)
    processed_cta_text = process_template_string(cta_text, context)

    {
      title: processed_title,
      description: processed_description,
      cta_text: processed_cta_text
    }
  end

  def widgets_for_product(product)
    user_widgets = product.user.social_proof_widgets.enabled_widgets
    universal_widgets = user_widgets.universal
    product_specific_widgets = user_widgets.product_specific.joins(:links).where(links: { id: product.id })

    product_specific_widgets.presence || universal_widgets.limit(1)
  end

  def template_context_for_product(product)
    # Get recent successful purchases for social proof data
    recent_purchases = product.sales
                             .where(state: Purchase::ALL_SUCCESS_STATES)
                             .where(created_at: 48.hours.ago..)
                             .order(created_at: :desc)
                             .limit(10)

    recent_purchase = recent_purchases.first

    # Product-specific data
    context = {
      product_name: product.name,
      price: Money.new(product.cached_default_price_cents, product.price_currency_type || "USD").format,
      total_sales: product.successful_sales_count.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse
    }

    # Recent purchase data for social proof
    if recent_purchase
      # Anonymize customer name (first name + initial)
      customer_name = if recent_purchase.full_name.present?
        name_parts = recent_purchase.full_name.split(" ")
        first_name = name_parts.first
        if name_parts.length > 1
          "#{first_name} #{name_parts.last[0]}."
        else
          first_name
        end
      else
        "Someone"
      end

      context.merge!({
                       country: recent_purchase.country || "Unknown",
                       customer_name: customer_name,
                       recent_sale_time: ActionController::Base.helpers.time_ago_in_words(recent_purchase.created_at) + " ago"
                     })
    else
      # Fallback when no recent purchases
      context.merge!({
                       country: "Unknown",
                       customer_name: "Someone",
                       recent_sale_time: "recently"
                     })
    end

    context
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

  def publish!
    update!(enabled: true)
  end

  private
    def set_defaults
      self.enabled = false if enabled.nil?
      self.cta_type ||= "button"
      self.image_type ||= "none"
    end

    def unpublish_if_content_changed
      return if new_record?
      return unless enabled?

      # Define content fields that should trigger unpublishing when changed
      content_fields = %w[
        name title description cta_text cta_type image_type
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

    def template_variables_valid
      allowed_variables = %w[product_name price total_sales country customer_name recent_sale_time]
      template_fields = [title, description, cta_text].compact

      template_fields.each do |field|
        variables = field.scan(/\{\{([^}]+)\}\}/).flatten.map(&:strip)
        invalid_variables = variables - allowed_variables

        if invalid_variables.any?
          errors.add(:base, "Invalid template variables: #{invalid_variables.join(', ')}. Allowed variables are: #{allowed_variables.join(', ')}")
        end
      end
    end

    def template_syntax_valid
      template_fields = [
        { field: title, name: "title" },
        { field: description, name: "description" },
        { field: cta_text, name: "cta_text" }
      ].reject { |item| item[:field].blank? }

      template_fields.each do |item|
        field_value = item[:field]
        field_name = item[:name]

        # Check for unmatched braces
        if field_value.count("{{") != field_value.count("}}")
          errors.add(field_name.to_sym, "has unmatched template braces")
        end

        # Check for empty variables
        if field_value.match?(/\{\{\s*\}\}/)
          errors.add(field_name.to_sym, "contains empty template variables")
        end

        # Check for nested braces
        if field_value.match(/\{\{[^}]*\{\{/) || field_value.match(/\}\}[^{]*\}\}/)
          errors.add(field_name.to_sym, "contains nested or malformed template braces")
        end
      end
    end

    def universal_widget_limit
      return unless universal?

      existing_universal = user.social_proof_widgets.alive.universal
      existing_universal = existing_universal.where.not(id: id) if persisted?

      if existing_universal.count >= 5
        errors.add(:universal, "You can have at most 5 universal widgets")
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

    def process_template_string(template, context)
      return template if template.blank?

      result = template.dup

      context.each do |key, value|
        placeholder = "{{#{key}}}"
        result.gsub!(placeholder, value.to_s) if result.include?(placeholder)
      end

      result
    end
end
