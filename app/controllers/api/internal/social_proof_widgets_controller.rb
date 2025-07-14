# frozen_string_literal: true

class Api::Internal::SocialProofWidgetsController < Api::Internal::BaseController
  include SocialProofCookie

  before_action :set_widget

  def impression
    @widget.increment_impression!
    head :ok
  end

  def click
    @widget.increment_click!

    # Set attribution cookie
    create_social_proof_cookie(@widget)

    head :ok
  end

  def close
    @widget.increment_close!
    head :ok
  end

  private
    def set_widget
      @widget = SocialProofWidget.find_by_external_id!(params[:id])
    end
end
