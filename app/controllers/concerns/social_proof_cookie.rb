# frozen_string_literal: true

module SocialProofCookie
  extend ActiveSupport::Concern
  
  def create_social_proof_cookie(widget)
    cookies[widget.cookie_key] = {
      value: Time.current.to_i,
      expires: widget.class.cookie_lifetime.from_now,
      httponly: true,
      domain: :all
    }
  end
  
  def fetch_social_proof_widget_from_cookies
    widget_cookies = {}
    cookies.each do |key, value|
      if key.starts_with?(SocialProofWidget::SOCIAL_PROOF_COOKIE_NAME_PREFIX)
        widget_cookies[key] = value
      end
    end
    return nil if widget_cookies.empty?
    
    # Get most recent cookie (highest timestamp)
    latest_cookie = widget_cookies.max_by { |k, v| v.to_i }
    external_id = latest_cookie[0].gsub(SocialProofWidget::SOCIAL_PROOF_COOKIE_NAME_PREFIX, "")
    
    # URL decode the external_id in case it's URL encoded
    external_id = CGI.unescape(external_id)
    
    SocialProofWidget.find_by_external_id(external_id)
  end
  
  def fetch_social_proof_widget_with_timestamp_from_cookies
    widget_cookies = {}
    cookies.each do |key, value|
      if key.starts_with?(SocialProofWidget::SOCIAL_PROOF_COOKIE_NAME_PREFIX)
        widget_cookies[key] = value
      end
    end
    return [nil, nil] if widget_cookies.empty?
    
    # Get most recent cookie (highest timestamp)
    latest_cookie = widget_cookies.max_by { |k, v| v.to_i }
    external_id = latest_cookie[0].gsub(SocialProofWidget::SOCIAL_PROOF_COOKIE_NAME_PREFIX, "")
    cookie_timestamp = Time.at(latest_cookie[1].to_i)
    
    # URL decode the external_id in case it's URL encoded
    external_id = CGI.unescape(external_id)
    
    widget = SocialProofWidget.find_by_external_id(external_id)
    [widget, cookie_timestamp]
  end
end