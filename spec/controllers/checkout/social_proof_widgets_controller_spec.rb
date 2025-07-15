# frozen_string_literal: true

require "spec_helper"

describe Checkout::SocialProofWidgetsController do
  let(:user) { create(:user) }
  let(:product) { create(:product, user: user) }
  let(:widget) { create(:social_proof_widget, user: user, name: "Test Widget", widget_type: "purchases", cta_type: "button", image_type: "icon", icon_name: "flame-fill") }

  before do
    sign_in user
    allow(GlobalConfig).to receive(:get).with("OBFUSCATE_IDS_CIPHER_KEY").and_return("test_cipher_key")
    allow(GlobalConfig).to receive(:get).with("OBFUSCATE_IDS_NUMERIC_CIPHER_KEY").and_return("123456")
    allow(GlobalConfig).to receive(:get).with("AWS_ACCESS_KEY_ID").and_return("test_aws_key")
    allow(GlobalConfig).to receive(:get).with("AWS_SECRET_ACCESS_KEY").and_return("test_aws_secret")
    allow(GlobalConfig).to receive(:get).with("AWS_BUCKET").and_return("test_bucket")
    allow(GlobalConfig).to receive(:get).with("AWS_REGION").and_return("us-east-1")
  end

  describe "GET #index" do
    it "renders the index page" do
      get :index
      expect(response).to have_http_status(:success)
      expect(assigns(:title)).to eq("Social Proof")
      expect(assigns(:presenter)).to be_a(Checkout::SocialProofWidgetsPresenter)
    end

    it "authorizes the request" do
      expect(controller).to receive(:authorize).with([:checkout, SocialProofWidget]).and_call_original
      get :index
    end
  end

  describe "GET #paged" do
    let!(:widgets) { create_list(:social_proof_widget, 3, user: user) }

    it "returns paginated widgets as JSON" do
      get :paged, format: :json
      expect(response).to have_http_status(:success)

      json_response = JSON.parse(response.body)
      expect(json_response).to have_key("widgets")
      expect(json_response).to have_key("pagination")
      expect(json_response["widgets"]).to be_an(Array)
    end
  end

  describe "GET #show" do
    it "shows the widget" do
      get :show, params: { id: widget.external_id }, format: :json
      expect(response).to have_http_status(:success)
      expect(assigns(:widget)).to eq(widget)
    end

    it "authorizes the widget" do
      expect(controller).to receive(:authorize).with([:checkout, widget]).and_call_original
      get :show, params: { id: widget.external_id }, format: :json
    end
  end

  describe "POST #create" do
    let(:valid_params) do
      {
        social_proof_widget: {
          name: "New Widget",
          widget_type: "purchases",
          cta_type: "button",
          image_type: "icon",
          icon_name: "flame-fill",
          universal: false
        }
      }
    end

    it "creates a new widget" do
      expect do
        post :create, params: valid_params, format: :json
      end.to change(SocialProofWidget, :count).by(1)
    end

    it "assigns the widget to the current user" do
      post :create, params: valid_params, format: :json
      expect(SocialProofWidget.last.user).to eq(user)
    end

    it "returns success JSON" do
      post :create, params: valid_params, format: :json
      expect(response).to have_http_status(:success)
      
      json_response = JSON.parse(response.body)
      expect(json_response["success"]).to be true
      expect(json_response).to have_key("widget")
    end

    context "with invalid params" do
      let(:invalid_params) do
        {
          social_proof_widget: {
            name: "", # Invalid - required field
            widget_type: "purchases",
            cta_type: "button",
            image_type: "icon",
            icon_name: "flame-fill"
          }
        }
      end

      it "does not create a widget" do
        expect do
          post :create, params: invalid_params, format: :json
        end.not_to change(SocialProofWidget, :count)
      end

      it "returns error JSON" do
        post :create, params: invalid_params, format: :json
        expect(response).to have_http_status(:success)
        
        json_response = JSON.parse(response.body)
        expect(json_response["success"]).to be false
        expect(json_response).to have_key("error")
      end
    end
  end

  describe "PATCH #update" do
    let(:update_params) do
      {
        id: widget.external_id,
        social_proof_widget: {
          name: "Updated Widget",
          widget_type: "purchases",
          cta_type: "button",
          image_type: "icon",
          icon_name: "flame-fill"
        }
      }
    end

    it "updates the widget" do
      patch :update, params: update_params, format: :json
      expect(response).to have_http_status(:success)
      
      json_response = JSON.parse(response.body)
      expect(json_response["success"]).to be true
      expect(widget.reload.name).to eq("Updated Widget")
    end

    it "returns success JSON" do
      patch :update, params: update_params, format: :json
      expect(response).to have_http_status(:success)
      
      json_response = JSON.parse(response.body)
      expect(json_response["success"]).to be true
      expect(json_response).to have_key("widget")
    end

    it "removes enabled from params" do
      params_with_enabled = update_params.deep_merge(
        social_proof_widget: { enabled: true }
      )

      patch :update, params: params_with_enabled, format: :json
      expect(widget.reload.enabled?).to be false # Should not be updated
    end

    context "with invalid params" do
      let(:invalid_params) do
        {
          id: widget.external_id,
          social_proof_widget: {
            name: "", # Invalid - required field
            widget_type: "purchases",
            cta_type: "button",
            image_type: "icon",
            icon_name: "flame-fill"
          }
        }
      end

      it "does not update the widget" do
        original_name = widget.name
        patch :update, params: invalid_params, format: :json
        expect(widget.reload.name).to eq(original_name)
      end

      it "returns error JSON" do
        patch :update, params: invalid_params, format: :json
        expect(response).to have_http_status(:success)
        
        json_response = JSON.parse(response.body)
        expect(json_response["success"]).to be false
        expect(json_response).to have_key("error")
      end
    end
  end

  describe "DELETE #destroy" do
    it "marks the widget as deleted" do
      delete :destroy, params: { id: widget.external_id }
      expect(widget.reload.deleted_at).to be_present
    end

    it "returns no content status" do
      delete :destroy, params: { id: widget.external_id }
      expect(response).to have_http_status(:no_content)
    end
  end

  describe "POST #publish" do
    let(:disabled_widget) { create(:social_proof_widget, user: user, enabled: false) }

    it "enables the widget" do
      post :publish, params: { id: disabled_widget.external_id }, format: :json
      expect(disabled_widget.reload.enabled?).to be true
    end

    it "returns success JSON" do
      post :publish, params: { id: disabled_widget.external_id }, format: :json
      expect(response).to have_http_status(:success)

      json_response = JSON.parse(response.body)
      expect(json_response["success"]).to be true
      expect(json_response).to have_key("widget")
    end

    context "when publish fails" do
      before do
        allow_any_instance_of(SocialProofWidget).to receive(:publish!).and_raise(StandardError, "Test error")
      end

      it "returns error JSON" do
        post :publish, params: { id: disabled_widget.external_id }, format: :json
        expect(response).to have_http_status(:success)

        json_response = JSON.parse(response.body)
        expect(json_response["success"]).to be false
        expect(json_response["error"]).to eq("Test error")
      end
    end
  end

  describe "POST #duplicate" do
    it "creates a duplicate widget" do
      widget # Force creation of the widget before the count check
      expect do
        post :duplicate, params: { id: widget.external_id }, format: :json
      end.to change(SocialProofWidget, :count).by(1)
    end

    it "duplicates with modified name" do
      post :duplicate, params: { id: widget.external_id }, format: :json
      duplicate = SocialProofWidget.last
      expect(duplicate.name).to eq("#{widget.name} (copy)")
    end

    it "returns success JSON" do
      post :duplicate, params: { id: widget.external_id }, format: :json
      expect(response).to have_http_status(:success)
      
      json_response = JSON.parse(response.body)
      expect(json_response["success"]).to be true
      expect(json_response).to have_key("widget")
    end
  end

  context "authorization" do
    let(:other_user) { create(:user) }
    let(:other_widget) { create(:social_proof_widget, user: other_user) }

    it "prevents access to other user's widgets" do
      expect do
        get :show, params: { id: other_widget.external_id }, format: :json
      end.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
