# frozen_string_literal: true

require "spec_helper"

describe SocialProofWidgetAttribution do
  describe "associations" do
    it { is_expected.to belong_to(:social_proof_widget) }
    it { is_expected.to belong_to(:purchase) }
  end

  describe "validations" do
    subject { create(:social_proof_widget_attribution) }

    it { is_expected.to validate_presence_of(:attributed_amount_cents) }
    it { is_expected.to validate_numericality_of(:attributed_amount_cents).is_greater_than(0) }
    it { is_expected.to validate_uniqueness_of(:purchase_id) }
  end

  describe "scopes" do
    describe ".successful_purchases" do
      let(:widget) { create(:social_proof_widget) }
      let(:successful_purchase) { create(:purchase, purchase_state: "successful") }
      let(:failed_purchase) { create(:purchase, purchase_state: "failed") }
      let!(:successful_attribution) { create(:social_proof_widget_attribution, social_proof_widget: widget, purchase: successful_purchase, attributed_amount_cents: 1000) }
      let!(:failed_attribution) { create(:social_proof_widget_attribution, social_proof_widget: widget, purchase: failed_purchase, attributed_amount_cents: 500) }

      it "returns only attributions for successful purchases" do
        expect(SocialProofWidgetAttribution.successful_purchases).to eq([successful_attribution])
      end
    end
  end

  describe "#attributed_amount" do
    let(:attribution) { create(:social_proof_widget_attribution, attributed_amount_cents: 1500) }

    it "returns Money object with correct amount" do
      expect(attribution.attributed_amount).to be_a(Money)
      expect(attribution.attributed_amount.cents).to eq(1500)
    end

    it "uses purchase currency when available" do
      attribution.purchase.update!(displayed_price_currency_type: "EUR")
      expect(attribution.attributed_amount.currency.to_s).to eq("EUR")
    end

    it "defaults to USD when purchase currency is nil" do
      attribution.purchase.update!(displayed_price_currency_type: nil)
      expect(attribution.attributed_amount.currency.to_s).to eq("USD")
    end
  end
end
