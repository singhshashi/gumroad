# frozen_string_literal: true

class SocialProofWidgetsController < ApplicationController
  include SocialProofCookie
  before_action :set_widget

  def impression
    @widget.increment_impression!
    render json: { success: true }
  end

  def click
    @widget.increment_click!
    create_social_proof_cookie(@widget)
    render json: { success: true }
  end

  def close
    @widget.increment_close!
    render json: { success: true }
  end

  private

  def set_widget
    @widget = SocialProofWidget.find_by_external_id!(params[:id])
  end
end