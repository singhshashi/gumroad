# frozen_string_literal: true

require "spec_helper"

describe SocialProofWidget do
  let(:user) { create(:user) }
  let(:product) { create(:product, user: user) }

  describe "associations" do
    it { should belong_to(:user) }
    it { should have_and_belong_to_many(:links).join_table("social_proof_widgets_links") }
    it { should have_many(:social_proof_widget_attributions).dependent(:destroy) }
    it { should have_many(:attributed_purchases).through(:social_proof_widget_attributions).source(:purchase) }
  end

  describe "validations" do
    subject { build(:social_proof_widget) }

    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_most(255) }
    it { should validate_inclusion_of(:cta_type).in_array(%w[button link none]) }
    it { should validate_inclusion_of(:image_type).in_array(%w[product_thumbnail custom_image icon none]) }
    it { should validate_inclusion_of(:widget_type).in_array(%w[purchases memberships]) }
    it { should validate_length_of(:title).is_at_most(50) }
    it { should validate_length_of(:message_end).is_at_most(200) }
    it { should validate_length_of(:cta_text).is_at_most(255) }

    context "when image_type is icon" do
      before { subject.image_type = "icon" }
      it { should validate_presence_of(:icon_name) }
    end

    context "when image_type is custom_image" do
      before { subject.image_type = "custom_image" }
      it "validates presence of custom_image_url" do
        subject.custom_image_url = nil
        expect(subject).not_to be_valid
        expect(subject.errors[:custom_image_url]).to include("must be present when using custom image type")
      end
    end
  end

  describe "scopes" do
    let!(:alive_widget) { create(:social_proof_widget, user: user) }
    let!(:deleted_widget) { create(:social_proof_widget, user: user, deleted_at: 1.day.ago) }
    let!(:universal_widget) { create(:social_proof_widget, user: user, universal: true) }
    let!(:product_specific_widget) { create(:social_proof_widget, user: user, universal: false) }
    let!(:enabled_widget) { create(:social_proof_widget, user: user, enabled: true) }
    let!(:disabled_widget) { create(:social_proof_widget, user: user, enabled: false) }
    let!(:purchases_widget) { create(:social_proof_widget, user: user, widget_type: "purchases") }
    let!(:memberships_widget) { create(:social_proof_widget, user: user, widget_type: "memberships") }

    describe ".alive" do
      it "returns non-deleted widgets" do
        expect(SocialProofWidget.alive).to include(alive_widget)
        expect(SocialProofWidget.alive).not_to include(deleted_widget)
      end
    end

    describe ".universal" do
      it "returns universal widgets" do
        expect(SocialProofWidget.universal).to include(universal_widget)
        expect(SocialProofWidget.universal).not_to include(product_specific_widget)
      end
    end

    describe ".product_specific" do
      it "returns non-universal widgets" do
        expect(SocialProofWidget.product_specific).to include(product_specific_widget)
        expect(SocialProofWidget.product_specific).not_to include(universal_widget)
      end
    end

    describe ".enabled_widgets" do
      it "returns alive and enabled widgets" do
        expect(SocialProofWidget.enabled_widgets).to include(enabled_widget)
        expect(SocialProofWidget.enabled_widgets).not_to include(disabled_widget)
        expect(SocialProofWidget.enabled_widgets).not_to include(deleted_widget)
      end
    end

    describe ".purchases_widgets" do
      it "returns purchases type widgets" do
        expect(SocialProofWidget.purchases_widgets).to include(purchases_widget)
        expect(SocialProofWidget.purchases_widgets).not_to include(memberships_widget)
      end
    end

    describe ".memberships_widgets" do
      it "returns memberships type widgets" do
        expect(SocialProofWidget.memberships_widgets).to include(memberships_widget)
        expect(SocialProofWidget.memberships_widgets).not_to include(purchases_widget)
      end
    end
  end

  describe "flags" do
    let(:widget) { create(:social_proof_widget, enabled: false) }

    it "has enabled flag" do
      expect(widget).to respond_to(:enabled?)
      expect(widget).to respond_to(:enabled=)
    end

    it "defaults to disabled" do
      expect(widget.enabled?).to be false
    end
  end

  describe "json data accessors" do
    let(:widget) { create(:social_proof_widget) }

    it "has custom_image_url accessor" do
      widget.custom_image_url = "https://example.com/image.jpg"
      expect(widget.custom_image_url).to eq("https://example.com/image.jpg")
    end

    it "has icon_name accessor" do
      widget.icon_name = "heart-fill"
      expect(widget.icon_name).to eq("heart-fill")
    end

    it "has icon_color accessor with default" do
      expect(widget.icon_color).to eq("#059669")
      widget.icon_color = "#ff0000"
      expect(widget.icon_color).to eq("#ff0000")
    end

    it "has analytics_data accessor with default" do
      expect(widget.analytics_data).to eq({})
      widget.analytics_data = { "impressions" => 100 }
      expect(widget.analytics_data).to eq({ "impressions" => 100 })
    end
  end

  describe "instance methods" do
    let(:widget) { create(:social_proof_widget) }

    describe "image type predicates" do
      it "#icon_type?" do
        widget.image_type = "icon"
        expect(widget.icon_type?).to be true

        widget.image_type = "custom_image"
        expect(widget.icon_type?).to be false
      end

      it "#custom_image?" do
        widget.image_type = "custom_image"
        expect(widget.custom_image?).to be true

        widget.image_type = "icon"
        expect(widget.custom_image?).to be false
      end

      it "#product_thumbnail?" do
        widget.image_type = "product_thumbnail"
        expect(widget.product_thumbnail?).to be true

        widget.image_type = "icon"
        expect(widget.product_thumbnail?).to be false
      end
    end

    describe "CTA predicates" do
      it "#has_cta?" do
        widget.cta_type = "button"
        expect(widget.has_cta?).to be true

        widget.cta_type = "none"
        expect(widget.has_cta?).to be false
      end

      it "#button_cta?" do
        widget.cta_type = "button"
        expect(widget.button_cta?).to be true

        widget.cta_type = "link"
        expect(widget.button_cta?).to be false
      end

      it "#link_cta?" do
        widget.cta_type = "link"
        expect(widget.link_cta?).to be true

        widget.cta_type = "button"
        expect(widget.link_cta?).to be false
      end
    end

    describe "widget type predicates" do
      it "#purchases_widget?" do
        widget.widget_type = "purchases"
        expect(widget.purchases_widget?).to be true

        widget.widget_type = "memberships"
        expect(widget.purchases_widget?).to be false
      end

      it "#memberships_widget?" do
        widget.widget_type = "memberships"
        expect(widget.memberships_widget?).to be true

        widget.widget_type = "purchases"
        expect(widget.memberships_widget?).to be false
      end
    end

    describe "#generate_widget_data_for_product" do
      let(:product) { create(:product, user: user) }

      context "for purchases widget" do
        let(:widget) { create(:social_proof_widget, widget_type: "purchases") }

        it "returns purchases data structure" do
          allow(widget).to receive(:purchases_last_24h).with(product).and_return(42)

          data = widget.generate_widget_data_for_product(product)

          expect(data).to include(
            title: widget.title,
            message_end: widget.message_end,
            cta_text: widget.cta_text,
            number: 42,
            number_text: "purchases in the last 24 hours"
          )
        end
      end

      context "for memberships widget" do
        let(:widget) { create(:social_proof_widget, widget_type: "memberships") }

        it "returns memberships data structure" do
          allow(widget).to receive(:total_memberships).with(product).and_return(123)

          data = widget.generate_widget_data_for_product(product)

          expect(data).to include(
            title: widget.title,
            message_end: widget.message_end,
            cta_text: widget.cta_text,
            number: 123,
            number_text: "total members"
          )
        end
      end
    end

    describe "#purchases_last_24h" do
      let(:widget) { create(:social_proof_widget) }
      let(:product) { create(:product, user: user) }

      it "counts successful purchases in last 24 hours" do
        create(:purchase, link: product, state: "successful", created_at: 25.hours.ago)
        create(:purchase, link: product, state: "successful", created_at: 1.hour.ago)
        create(:purchase, link: product, state: "failed", created_at: 1.hour.ago)

        expect(widget.purchases_last_24h(product)).to eq(1)
      end
    end

    describe "#total_memberships" do
      let(:widget) { create(:social_proof_widget) }
      let(:product) { create(:product, user: user) }

      it "counts active subscriptions for product" do
        create(:subscription, link: product)
        create(:subscription, link: product, cancelled_at: 1.day.ago)

        expect(widget.total_memberships(product)).to eq(1)
      end
    end

    describe "analytics methods" do
      let(:widget) { create(:social_proof_widget, analytics_data: {}) }

      describe "#increment_impression!" do
        it "increments impression count" do
          expect { widget.increment_impression! }.to change { widget.reload.analytics_data["impressions"] }.from(nil).to(1)
          expect { widget.increment_impression! }.to change { widget.reload.analytics_data["impressions"] }.from(1).to(2)
        end
      end

      describe "#increment_click!" do
        it "increments click count" do
          expect { widget.increment_click! }.to change { widget.reload.analytics_data["clicks"] }.from(nil).to(1)
          expect { widget.increment_click! }.to change { widget.reload.analytics_data["clicks"] }.from(1).to(2)
        end
      end

      describe "#increment_close!" do
        it "increments close count" do
          expect { widget.increment_close! }.to change { widget.reload.analytics_data["closes"] }.from(nil).to(1)
          expect { widget.increment_close! }.to change { widget.reload.analytics_data["closes"] }.from(1).to(2)
        end
      end

      describe "#conversion_rate" do
        it "calculates conversion rate" do
          widget.analytics_data = { "impressions" => 100, "clicks" => 25 }
          widget.save!
          expect(widget.conversion_rate).to eq(25.0)
        end

        it "returns 0 when no impressions" do
          widget.analytics_data = { "clicks" => 25 }
          widget.save!
          expect(widget.conversion_rate).to eq(0)
        end

        it "handles nil values" do
          widget.analytics_data = {}
          widget.save!
          expect(widget.conversion_rate).to eq(0)
        end
      end
    end

    describe "cookie methods" do
      let(:widget) { create(:social_proof_widget) }

      before do
        allow(GlobalConfig).to receive(:get).with("OBFUSCATE_IDS_CIPHER_KEY").and_return("test_cipher_key")
        allow(GlobalConfig).to receive(:get).with("OBFUSCATE_IDS_NUMERIC_CIPHER_KEY").and_return("123456")
      end

      describe "#cookie_key" do
        it "returns cookie key with prefix and external_id" do
          expect(widget.cookie_key).to eq("_gumroad_social_proof_#{widget.external_id}")
        end
      end

      describe ".cookie_lifetime" do
        it "returns 30 days" do
          expect(SocialProofWidget.cookie_lifetime).to eq(30.days)
        end
      end
    end

    describe "revenue methods" do
      let(:widget) { create(:social_proof_widget) }
      let(:purchase) { create(:purchase, link: product, price_cents: 1000) }

      before do
        create(:social_proof_widget_attribution,
               social_proof_widget: widget,
               purchase: purchase,
               attributed_amount_cents: 500,
               attribution_status: "confirmed")
      end

      describe "#total_attributed_revenue_cents" do
        it "sums confirmed attribution amounts" do
          expect(widget.total_attributed_revenue_cents).to eq(500)
        end
      end

      describe "#total_attributed_revenue" do
        it "returns Money object" do
          revenue = widget.total_attributed_revenue
          expect(revenue).to be_a(Money)
          expect(revenue.cents).to eq(500)
          expect(revenue.currency.to_s).to eq("USD")
        end
      end

      describe "#attributed_purchases_count" do
        it "counts confirmed attributions" do
          expect(widget.attributed_purchases_count).to eq(1)
        end
      end
    end

    describe "#publish!" do
      let(:widget) { create(:social_proof_widget, enabled: false) }

      it "enables the widget" do
        expect { widget.publish! }.to change { widget.reload.enabled? }.from(false).to(true)
      end
    end

    describe "#duplicate!" do
      let(:widget) { create(:social_proof_widget, name: "Original Widget") }

      it "creates a copy with modified name" do
        duplicate = widget.duplicate!

        expect(duplicate.name).to eq("Original Widget (copy)")
        expect(duplicate.user).to eq(widget.user)
        expect(duplicate.widget_type).to eq(widget.widget_type)
        expect(duplicate.title).to eq(widget.title)
        expect(duplicate.enabled?).to be false
        expect(duplicate).to be_persisted
      end

      context "with product-specific widget" do
        let(:product1) { create(:product, user: user) }
        let(:product2) { create(:product, user: user) }
        let(:widget) { create(:social_proof_widget, user: user, universal: false) }

        before do
          widget.links = [product1, product2]
        end

        it "copies link associations" do
          duplicate = widget.duplicate!
          expect(duplicate.links).to match_array([product1, product2])
        end
      end

      context "with universal widget" do
        let(:widget) { create(:social_proof_widget, universal: true) }

        it "does not copy link associations" do
          duplicate = widget.duplicate!
          expect(duplicate.links).to be_empty
        end
      end
    end
  end

  describe "class methods" do
    describe "#widgets_for_product" do
      let(:widget) { create(:social_proof_widget, user: user) }
      let(:product) { create(:product, user: user) }

      context "with product-specific widgets" do
        let!(:product_widget) { create(:social_proof_widget, user: user, universal: false, enabled: true) }
        let!(:universal_widget) { create(:social_proof_widget, user: user, universal: true, enabled: true) }

        before do
          product_widget.links = [product]
        end

        it "returns product-specific widgets over universal ones" do
          result = widget.widgets_for_product(product)
          expect(result).to include(product_widget)
          expect(result).not_to include(universal_widget)
        end
      end

      context "without product-specific widgets" do
        let!(:universal_widget) { create(:social_proof_widget, user: user, universal: true, enabled: true) }

        it "returns limited universal widgets" do
          result = widget.widgets_for_product(product)
          expect(result).to include(universal_widget)
          expect(result.count).to eq(1)
        end
      end
    end
  end

  describe "callbacks" do
    describe "before_validation :set_defaults" do
      context "on create" do
        it "sets enabled to false by default" do
          widget = SocialProofWidget.new(user: user, name: "Test")
          widget.valid?
          expect(widget.enabled).to be false
        end

        it "sets widget_type to purchases by default" do
          widget = SocialProofWidget.new(user: user, name: "Test")
          widget.valid?
          expect(widget.widget_type).to eq("purchases")
        end


        it "does not override existing values" do
          widget = SocialProofWidget.new(
            user: user,
            name: "Test",
            widget_type: "purchases",
            title: "Custom Title"
          )
          widget.valid?

          expect(widget.title).to eq("Custom Title")
        end

        it "sets fallback defaults" do
          widget = SocialProofWidget.new(user: user, name: "Test", title: "Custom")
          widget.valid?

          expect(widget.cta_type).to eq("none")
          expect(widget.image_type).to eq("none")
        end
      end
    end

    describe "before_save :unpublish_if_content_changed" do
      let(:widget) { create(:social_proof_widget, enabled: true, name: "Original") }

      it "unpublishes when content fields change" do
        widget.name = "Changed"
        widget.save!
        expect(widget.enabled?).to be false
      end

      it "unpublishes when widget_type changes" do
        widget.widget_type = "memberships"
        widget.save!
        expect(widget.enabled?).to be false
      end

      it "unpublishes when universal flag changes" do
        widget.universal = true
        widget.save!
        expect(widget.enabled?).to be false
      end

      it "does not unpublish when non-content fields change" do
        widget.analytics_data = { "impressions" => 1 }
        widget.save!
        expect(widget.enabled?).to be true
      end

      it "does not affect new records" do
        new_widget = build(:social_proof_widget, enabled: true, name: "New")
        new_widget.name = "Changed"
        new_widget.save!
        expect(new_widget.enabled?).to be true
      end

      it "does not affect already disabled widgets" do
        widget.update!(enabled: false)
        widget.name = "Changed Again"
        widget.save!
        expect(widget.enabled?).to be false
      end
    end
  end
end
