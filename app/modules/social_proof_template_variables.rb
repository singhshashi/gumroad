# frozen_string_literal: true

# Social Proof Widget Template Variables
# This file defines the template variables that can be used in social proof widget content.
# Keep this synchronized with the frontend constants in app/javascript/utils/socialProofTemplateVariables.ts

module SocialProofTemplateVariables
  ALLOWED_VARIABLES = %w[
    product_name
    price
    total_sales
    country
    customer_name
    recent_sale_time
  ].freeze
end