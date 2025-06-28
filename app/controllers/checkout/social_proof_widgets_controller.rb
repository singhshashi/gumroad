# frozen_string_literal: true

class Checkout::SocialProofWidgetsController < Sellers::BaseController
  include Pagy::Backend

  PER_PAGE = 10

  before_action :set_widget, only: [:show, :update, :destroy]
  before_action :clean_params, only: [:create, :update]

  def index
    authorize [:checkout, SocialProofWidget]

    @title = "Social Proof"
    pagination, widgets = fetch_widgets
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:, widgets:, pagination:)
  end

  def paged
    authorize [:checkout, SocialProofWidget]

    pagination, widgets = fetch_widgets
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)

    render json: { widgets: widgets.map { @presenter.widget_props(_1) }, pagination: }
  end

  def show
    authorize [:checkout, @widget]

    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)
    render json: @presenter.widget_props(@widget)
  end

  def create
    authorize [:checkout, SocialProofWidget]

    @widget = pundit_user.social_proof_widgets.build(widget_params)

    if @widget.save
      @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)
      render json: @presenter.widget_props(@widget), status: :created
    else
      render json: { errors: @widget.errors }, status: :unprocessable_entity
    end
  end

  def update
    authorize [:checkout, @widget]

    if @widget.update(widget_params)
      @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)
      render json: @presenter.widget_props(@widget)
    else
      render json: { errors: @widget.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    authorize [:checkout, @widget]

    @widget.mark_deleted!
    head :no_content
  end

  def analytics
    authorize [:checkout, SocialProofWidget]

    widgets_with_analytics = pundit_user.social_proof_widgets.alive.includes(:links)
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)

    analytics_data = widgets_with_analytics.map do |widget|
      @presenter.widget_analytics_props(widget)
    end

    render json: { analytics: analytics_data }
  end

  private

  def set_widget
    @widget = pundit_user.social_proof_widgets.find_by_external_id!(params[:id])
  end

  def fetch_widgets
    widgets = pundit_user.social_proof_widgets.alive.order(created_at: :desc)
    
    if params[:search].present?
      widgets = widgets.where("name ILIKE ?", "%#{params[:search]}%")
    end

    pagy(widgets, items: PER_PAGE)
  end

  def widget_params
    params.require(:social_proof_widget).permit(
      :name,
      :universal,
      :title,
      :description,
      :cta_text,
      :cta_type,
      :image_type,
      :custom_image_url,
      :enabled,
      link_ids: []
    )
  end

  def clean_params
    params[:social_proof_widget][:link_ids] = params[:social_proof_widget][:link_ids]&.compact_blank
    params[:social_proof_widget][:custom_image_url] = nil if params[:social_proof_widget][:image_type] != 'custom_image'
  end
end