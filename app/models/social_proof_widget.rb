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
      icon_solid_fire 
      icon_solid_heart 
      icon_patch_check_fill 
      icon_cart3_fill 
      icon_solid_users 
      icon_star_fill 
      icon_solid_sparkles 
      icon_clock_fill 
      icon_solid_gift 
      icon_solid_lightning_bolt
    ] 
  }
  validates :title, length: { maximum: 500 }
  validates :description, length: { maximum: 1000 }
  validates :cta_text, length: { maximum: 255 }
  
  validate :universal_widget_limit
  validate :custom_image_presence
  
  scope :alive, -> { where(deleted_at: nil) }
  scope :universal, -> { where(universal: true) }
  scope :product_specific, -> { where(universal: false) }
  scope :enabled_widgets, -> { alive.is_enabled }
  
  attr_json_data_accessor :custom_image_url, default: -> { nil }
  attr_json_data_accessor :analytics_data, default: -> { {} }
  
  before_validation :set_defaults, on: :create
  
  def icon_type?
    image_type.starts_with?('icon_')
  end
  
  def custom_image?
    image_type == 'custom_image'
  end
  
  def product_thumbnail?
    image_type == 'product_thumbnail'
  end
  
  def has_cta?
    cta_type != 'none'
  end
  
  def button_cta?
    cta_type == 'button'
  end
  
  def link_cta?
    cta_type == 'link'
  end
  
  def icon_class
    return nil unless icon_type?
    
    icon_name = image_type.gsub('icon_', '')
    
    case icon_name
    when 'solid_fire'
      'fas fa-fire'
    when 'solid_heart'
      'fas fa-heart'
    when 'patch_check_fill'
      'fas fa-check-circle'
    when 'cart3_fill'
      'fas fa-shopping-cart'
    when 'solid_users'
      'fas fa-users'
    when 'star_fill'
      'fas fa-star'
    when 'solid_sparkles'
      'fas fa-sparkles'
    when 'clock_fill'
      'fas fa-clock'
    when 'solid_gift'
      'fas fa-gift'
    when 'solid_lightning_bolt'
      'fas fa-bolt'
    else
      'fas fa-info-circle'
    end
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
  
  def increment_impression!
    analytics_data = self.analytics_data || {}
    analytics_data['impressions'] = (analytics_data['impressions'] || 0) + 1
    self.analytics_data = analytics_data
    save!
  end
  
  def increment_click!
    analytics_data = self.analytics_data || {}
    analytics_data['clicks'] = (analytics_data['clicks'] || 0) + 1
    self.analytics_data = analytics_data
    save!
  end
  
  def increment_close!
    analytics_data = self.analytics_data || {}
    analytics_data['closes'] = (analytics_data['closes'] || 0) + 1
    self.analytics_data = analytics_data
    save!
  end
  
  def conversion_rate
    impressions = analytics_data['impressions'] || 0
    clicks = analytics_data['clicks'] || 0
    
    return 0 if impressions == 0
    
    (clicks.to_f / impressions.to_f * 100).round(2)
  end
  
  private
  
  def set_defaults
    self.enabled = true if enabled.nil?
    self.cta_type ||= 'button'
    self.image_type ||= 'product_thumbnail'
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