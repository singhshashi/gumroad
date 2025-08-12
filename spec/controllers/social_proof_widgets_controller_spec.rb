# frozen_string_literal: true

require "spec_helper"

describe SocialProofWidgetsController do
  let(:user) { create(:user) }
  let(:product) { create(:product, user: user) }
  let(:widget) { create(:social_proof_widget, user: user) }

  before do
    allow(GlobalConfig).to receive(:get).with("OBFUSCATE_IDS_CIPHER_KEY").and_return("test_cipher_key")
    allow(GlobalConfig).to receive(:get).with("OBFUSCATE_IDS_NUMERIC_CIPHER_KEY").and_return("123456")
  end

  describe "POST #impression" do
    it "increments widget impression count" do
      expect do
        post :impression, params: { id: widget.external_id }
      end.to change { widget.reload.analytics_data["impressions"] }.from(nil).to(1)
    end

    it "returns success response" do
      post :impression, params: { id: widget.external_id }
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq({ "success" => true })
    end

    it "returns 404 for non-existent widget" do
      expect do
        post :impression, params: { id: "invalid" }
      end.to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe "POST #click" do
    it "increments widget click count" do
      expect do
        post :click, params: { id: widget.external_id }
      end.to change { widget.reload.analytics_data["clicks"] }.from(nil).to(1)
    end

    it "creates social proof cookie" do
      post :click, params: { id: widget.external_id }
      expect(cookies[widget.cookie_key]).to be_present
    end

    it "returns success response" do
      post :click, params: { id: widget.external_id }
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq({ "success" => true })
    end
  end

  describe "POST #close" do
    it "increments widget close count" do
      expect do
        post :close, params: { id: widget.external_id }
      end.to change { widget.reload.analytics_data["closes"] }.from(nil).to(1)
    end

    it "returns success response" do
      post :close, params: { id: widget.external_id }
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq({ "success" => true })
    end
  end
end
