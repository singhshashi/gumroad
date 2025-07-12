# frozen_string_literal: true

class Checkout::SocialProofWidgetsController < Sellers::BaseController
  include Pagy::Backend

  PER_PAGE = 10

  before_action :set_widget, only: [:show, :update, :destroy, :publish, :duplicate]
  before_action :clean_params, only: [:create, :update]
  before_action :remove_enabled_from_update, only: [:update]

  def index
    authorize [:checkout, SocialProofWidget]

    @title = "Social Proof"
    pagination, widgets = fetch_widgets
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:, widgets:, pagination:)
  end

  def paged
    authorize [:checkout, SocialProofWidget]

    pagination, widgets = fetch_widgets
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:, widgets:, pagination:)

    render json: { widgets: widgets.map { @presenter.widget_props(_1) }, pagination: @presenter.pagination_props }
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
      render json: { success: true, widget: @presenter.widget_props(@widget) }
    else
      render json: { success: false, error: @widget.errors.first.message }
    end
  end

  def update
    authorize [:checkout, @widget]

    if @widget.update(widget_params)
      @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)
      render json: { success: true, widget: @presenter.widget_props(@widget) }
    else
      render json: { success: false, error: @widget.errors.first.message }
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

  def publish
    authorize [:checkout, @widget]

    @widget.publish!
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)
    render json: { success: true, widget: @presenter.widget_props(@widget) }
  rescue => e
    render json: { success: false, error: e.message }
  end

  def duplicate
    authorize [:checkout, @widget]

    duplicated_widget = @widget.duplicate!
    @presenter = Checkout::SocialProofWidgetsPresenter.new(pundit_user:)
    render json: { success: true, widget: @presenter.widget_props(duplicated_widget) }
  rescue => e
    render json: { success: false, error: e.message }
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
        :widget_type,
        :title,
        :message_end,
        :cta_text,
        :cta_type,
        :image_type,
        :custom_image_url,
        :icon_name,
        :icon_color,
        :enabled,
        link_ids: []
      )
    end

    def clean_params
      # Convert external IDs to internal IDs for link_ids
      if params[:social_proof_widget][:link_ids].present?
        external_ids = params[:social_proof_widget][:link_ids].compact_blank
        internal_ids = pundit_user.user.links.by_external_ids(external_ids).pluck(:id)
        params[:social_proof_widget][:link_ids] = internal_ids
      else
        params[:social_proof_widget][:link_ids] = []
      end

      params[:social_proof_widget][:custom_image_url] = nil if params[:social_proof_widget][:image_type] != "custom_image"
      params[:social_proof_widget][:icon_name] = nil if params[:social_proof_widget][:image_type] != "icon"
      params[:social_proof_widget][:icon_color] = nil if params[:social_proof_widget][:image_type] != "icon"
    end

    def remove_enabled_from_update
      # Remove enabled from params for updates - it should only be set via publish action
      params[:social_proof_widget].delete(:enabled)
    end
end
