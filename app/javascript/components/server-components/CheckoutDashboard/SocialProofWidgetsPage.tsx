import cx from "classnames";
import * as React from "react";
import { createCast } from "ts-safe-cast";

import { AbortError } from "$app/utils/request";
import { register } from "$app/utils/serverComponentUtil";
import { writeQueryParams } from "$app/utils/url";

import { Button } from "$app/components/Button";
import { Layout, Page } from "$app/components/CheckoutDashboard/Layout";
import { Icon } from "$app/components/Icons";
import { ImageUploader } from "$app/components/ImageUploader";
import { Pagination, PaginationProps } from "$app/components/Pagination";
import { Popover } from "$app/components/Popover";
import { Preview } from "$app/components/Preview";
import { Select } from "$app/components/Select";
import { showAlert } from "$app/components/server-components/Alert";
import { SocialProofWidget } from "$app/components/SocialProofWidget";
import { Toggle } from "$app/components/Toggle";
import { TypeSafeOptionSelect } from "$app/components/TypeSafeOptionSelect";

import placeholder from "$assets/images/placeholders/social_widgets.png";

// Helper to safely cast known-valid icon names from backend
const toIconName = (iconName: string | null | undefined): IconName => iconName as IconName;

// Static configuration options (no server data needed)
const ICON_OPTIONS: IconOption[] = [
  { id: "icon_solid_fire", label: "Fire", icon_name: "flame-fill" },
  { id: "icon_solid_heart", label: "Heart", icon_name: "heart-fill" },
  { id: "icon_patch_check_fill", label: "Check", icon_name: "solid-check-circle" },
  { id: "icon_cart3_fill", label: "Cart", icon_name: "cart3-fill" },
  { id: "icon_solid_users", label: "Users", icon_name: "people-fill" },
  { id: "icon_star_fill", label: "Star", icon_name: "solid-star" },
  { id: "icon_solid_sparkles", label: "Sparkles", icon_name: "stickies" },
  { id: "icon_clock_fill", label: "Clock", icon_name: "clock-history" },
  { id: "icon_solid_gift", label: "Gift", icon_name: "gift-fill" },
  { id: "icon_solid_lightning_bolt", label: "Lightning", icon_name: "lighting-fill" },
];

const CTA_TYPE_OPTIONS: CtaTypeOption[] = [
  { id: "button", label: "Button" },
  { id: "link", label: "Link" },
  { id: "none", label: "No CTA" },
];

const IMAGE_TYPE_OPTIONS: ImageTypeOption[] = [
  { id: "product_thumbnail", label: "Product image" },
  { id: "custom_image", label: "Custom image" },
  { id: "none", label: "None" },
  { id: "icon", label: "Icon" },
];

type VariableInsertionButtonsProps = {
  onInsertVariable: (variable: string) => void;
};

const VariableInsertionButtons: React.FC<VariableInsertionButtonsProps> = ({ onInsertVariable }) => {
  const variables = [
    { key: "country", label: "Country", variable: "{{country}}" },
    { key: "customer_name", label: "Customer", variable: "{{customer_name}}" },
    { key: "price", label: "Price", variable: "{{price}}" },
    { key: "product_name", label: "Product", variable: "{{product_name}}" },
    { key: "total_sales", label: "Total sales", variable: "{{total_sales}}" },
    { key: "recent_sale_time", label: "Recent sale", variable: "{{recent_sale_time}}" },
  ];

  return (
    <div style={{ display: "flex", gap: "var(--spacer-2)", marginTop: "var(--spacer-2)", flexWrap: "wrap" }}>
      {variables.map((item) => (
        <Button
          key={item.key}
          small
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsertVariable(item.variable)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
};

type Product = {
  id: string;
  name: string;
  url: string;
  thumbnail_url?: string | null;
  sales_count: number;
};

type SocialProofWidget = {
  id: string;
  can_update: boolean;
  can_destroy: boolean;
  name: string;
  universal: boolean;
  title?: string | null;
  description?: string | null;
  cta_text?: string | null;
  cta_type: "button" | "link" | "none";
  image_type: string;
  custom_image_url?: string | null;
  icon_name?: string | null;
  icon_color?: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  products?: Product[] | null;
  analytics: {
    impressions: number;
    clicks: number;
    closes: number;
    conversion_rate: number;
  };
};

type ImageTypeOption = {
  id: string;
  label: string;
};

type IconOption = {
  id: string;
  label: string;
  icon_name: IconName;
};

type CtaTypeOption = {
  id: "button" | "link" | "none";
  label: string;
};

type SocialProofWidgetsPageProps = {
  widgets: SocialProofWidget[];
  products: Product[];
  pagination: PaginationProps | null;
  pages: Page[];
};

const SocialProofWidgetsPage = ({ widgets, products, pagination, pages }: SocialProofWidgetsPageProps) => {
  const [widgetsList, setWidgetsList] = React.useState(widgets);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = React.useState(false);
  const [view, setView] = React.useState<"list" | "create" | "edit">("list");
  const [editingWidget, setEditingWidget] = React.useState<SocialProofWidget | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const refreshWidgets = () => {
    try {
      setIsLoading(true);
      // TODO: Implement API call to refresh widgets
      // const response = await getPagedSocialProofWidgets({ search: searchTerm });
      // setWidgetsList(response.widgets);
    } catch (error) {
      if (!(error instanceof AbortError)) {
        showAlert("Failed to load widgets", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWidget = () => {
    setEditingWidget(null);
    setView("create");
  };

  const handleEditWidget = (widget: SocialProofWidget) => {
    setEditingWidget(widget);
    setView("edit");
  };

  const handleDeleteWidget = (widget: SocialProofWidget) => {
    if (!widget.can_destroy) return;

    // eslint-disable-next-line no-alert
    if (confirm(`Are you sure you want to delete "${widget.name}"?`)) {
      try {
        // TODO: Implement delete API call
        // await deleteSocialProofWidget(widget.id);
        setWidgetsList((prev) => prev.filter((w) => w.id !== widget.id));
        showAlert("Widget deleted successfully", "success");
      } catch (_error) {
        showAlert("Failed to delete widget", "error");
      }
    }
  };

  return view === "list" ? (
    <Layout
      currentPage="social_proof_widgets"
      pages={pages}
      actions={
        <>
          <Popover
            open={isSearchPopoverOpen}
            onToggle={setIsSearchPopoverOpen}
            aria-label="Search"
            trigger={
              <div className="button">
                <Icon name="solid-search" />
              </div>
            }
          >
            <div className="input">
              <Icon name="solid-search" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search"
                value={searchTerm || ""}
                onChange={(evt) => {
                  setSearchTerm(evt.target.value);
                }}
                onKeyDown={(evt) => {
                  if (evt.key === "Enter") {
                    // @ts-expect-error - writeQueryParams type signature issue
                    writeQueryParams({ search: searchTerm || undefined });
                    // Note: refreshWidgets is synchronous now, no need for void
                    refreshWidgets();
                    setIsSearchPopoverOpen(false);
                  }
                }}
              />
            </div>
          </Popover>
          <Button onClick={handleCreateWidget} color="accent">
            New widget
          </Button>
        </>
      }
    >
      <div className="container">
        <div className="row">
          <div className="col-12">
            {widgetsList.length === 0 && !isLoading ? (
              <div className="placeholder">
                <figure>
                  <img src={placeholder} />
                </figure>
                <div>
                  <h2>Use social proof to build trust and boost conversions</h2>
                  <p>Let your product page do the talking. Show off what's happening and get more people clicking.</p>
                  <Button onClick={handleCreateWidget} color="accent">
                    New widget
                  </Button>
                  <p>
                    <a href="#" data-helper-prompt="How can I use social proof widgets to boost conversions?">
                      Learn more about social proof
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="widgets-grid">
                  {widgetsList.map((widget) => (
                    <div key={widget.id} className="widget-card">
                      <div className="widget-header">
                        <h4>{widget.name}</h4>
                        <div className="widget-actions">
                          {widget.can_update ? (
                            <button
                              onClick={() => {
                                handleEditWidget(widget);
                              }}
                              className="btn-icon"
                              title="Edit widget"
                            >
                              <Icon name="solid-send" />
                            </button>
                          ) : null}
                          {widget.can_destroy ? (
                            <button
                              onClick={() => {
                                // Note: handleDeleteWidget is synchronous now, no need for void
                                handleDeleteWidget(widget);
                              }}
                              className="btn-icon btn-danger"
                              title="Delete widget"
                            >
                              <Icon name="trash2" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="widget-content">
                        <div className="widget-preview">
                          {widget.icon_name && widget.image_type === "icon" ? (
                            <Icon name={toIconName(widget.icon_name)} />
                          ) : null}
                          {widget.title ? <h5>{widget.title}</h5> : null}
                          {widget.description ? <p>{widget.description}</p> : null}
                          {widget.cta_text && widget.cta_type !== "none" ? (
                            <div className={cx("cta", `cta-${widget.cta_type}`)}>{widget.cta_text}</div>
                          ) : null}
                        </div>

                        <div className="widget-meta">
                          <div className="widget-scope">
                            {widget.universal ? (
                              <span className="scope-badge universal">Universal</span>
                            ) : (
                              <span className="scope-badge specific">{widget.products?.length || 0} products</span>
                            )}
                          </div>

                          <div className="widget-status">
                            <Toggle
                              value={widget.enabled}
                              onChange={() => {
                                /* TODO: Implement enable/disable */
                              }}
                              disabled={!widget.can_update}
                            />
                          </div>
                        </div>

                        <div className="widget-analytics">
                          <div className="analytics-stat">
                            <span className="stat-value">{widget.analytics.impressions}</span>
                            <span className="stat-label">Impressions</span>
                          </div>
                          <div className="analytics-stat">
                            <span className="stat-value">{widget.analytics.clicks}</span>
                            <span className="stat-label">Clicks</span>
                          </div>
                          <div className="analytics-stat">
                            <span className="stat-value">{widget.analytics.conversion_rate}%</span>
                            <span className="stat-label">CVR</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {pagination ? <Pagination pagination={pagination} onChangePage={() => {}} /> : null}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  ) : (
    <WidgetFormModal
      widget={editingWidget}
      products={products}
      view={view}
      onClose={() => setView("list")}
      onSave={(widget) => {
        if (editingWidget) {
          setWidgetsList((prev) => prev.map((w) => (w.id === widget.id ? widget : w)));
        } else {
          setWidgetsList((prev) => [widget, ...prev]);
        }
        setView("list");
      }}
    />
  );
};

// Widget Form Modal Component
const WidgetFormModal = ({
  widget,
  products,
  view,
  onClose,
  onSave,
}: {
  widget: SocialProofWidget | null;
  products: Product[];
  view: "create" | "edit";
  onClose: () => void;
  onSave: (widget: SocialProofWidget) => void;
}) => {
  // Temporarily suppress onSave usage for development
  void onSave;
  const [formData, setFormData] = React.useState({
    name: widget?.name || "",
    universal: widget?.universal || false,
    title: widget?.title || "",
    description: widget?.description || "",
    cta_text: widget?.cta_text || "",
    cta_type: widget?.cta_type || ("button" as const),
    image_type: widget?.image_type || "none",
    icon_name: widget?.icon_name || "flame-fill",
    icon_color: widget?.icon_color || "#D73027",
    custom_image_url: widget?.custom_image_url || "",
    enabled: widget?.enabled ?? true,
    link_ids: widget?.products?.map((p) => p.id) || [],
  });

  const [focusedField, setFocusedField] = React.useState<"title" | "description" | "cta_text" | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string[]>>({});
  const uid = React.useId();

  // Template validation helpers
  const validateTemplateString = (value: string): string[] => {
    const errors: string[] = [];

    if (!value) return errors;

    // Check for unmatched braces
    const openBraces = (value.match(/\{\{/gu) || []).length;
    const closeBraces = (value.match(/\}\}/gu) || []).length;

    if (openBraces !== closeBraces) {
      errors.push("Unmatched template braces");
    }

    // Check for empty variables
    if (value.match(/\{\{\s*\}\}/u)) {
      errors.push("Empty template variables not allowed");
    }

    // Check for nested braces
    if (value.match(/\{\{[^}]*\{\{/u) || value.match(/\}\}[^{]*\}\}/u)) {
      errors.push("Nested or malformed template braces");
    }

    // Check for invalid variables
    const allowedVariables = ["product_name", "price", "total_sales", "country", "customer_name", "recent_sale_time"];
    const variables = (value.match(/\{\{([^}]+)\}\}/gu) || []).map((v) => v.replace(/\{\{|\}\}/gu, "").trim());
    const invalidVariables = variables.filter((v) => !allowedVariables.includes(v));

    if (invalidVariables.length > 0) {
      errors.push(`Invalid variables: ${invalidVariables.join(", ")}`);
    }

    return errors;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time template validation for template fields
    if (["title", "description", "cta_text"].includes(field)) {
      const errors = validateTemplateString(value);
      setValidationErrors((prev) => ({ ...prev, [field]: errors }));
    }
  };

  const handleInsertVariable = (variable: string) => {
    if (!focusedField) return;

    const newValue = `${formData[focusedField] + variable} `;
    handleFieldChange(focusedField, newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement API call to create/update widget
      // const result = widget
      //   ? await updateSocialProofWidget(widget.id, formData)
      //   : await createSocialProofWidget(formData);

      // onSave(castSocialProofWidget(result));
      const message = view === "edit" ? "Widget updated successfully" : "Widget created successfully";
      showAlert(message, "success");
    } catch (_error) {
      const message = view === "edit" ? "Failed to update widget" : "Failed to create widget";
      showAlert(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPreviewProductData = () => {
    // Use data from the first available product, or fallback to sample data
    const firstProduct = products[0];

    return {
      name: firstProduct?.name || "Digital Marketing Course",
      price: "$29", // Would come from product.cached_default_price_cents formatted
      sales_count: firstProduct?.sales_count || 1247,
      country: "United States",
      customer_name: "Sarah M.", // Would be anonymized as "FirstName L." from recent purchase
      recent_sale_time: "2 hours ago", // Would be time_ago_in_words from recent purchase
    };
  };

  const getPreviewWidgetData = () => {
    // Get the image type and related data
    const imageType = formData.image_type;
    let customImageUrl = formData.custom_image_url;
    let productThumbnailUrl = "";

    // Handle different image types
    if (imageType === "custom_image") {
      // Use custom image URL if provided, otherwise fallback to placeholder
      customImageUrl ||= "https://via.placeholder.com/48x48/ff6b6b/ffffff?text=📈";
    } else if (imageType === "product_thumbnail") {
      // Use first product's thumbnail or a placeholder
      const firstProduct = products[0];
      productThumbnailUrl = firstProduct?.thumbnail_url || "https://via.placeholder.com/48x48/4ecdc4/ffffff?text=📦";
    }

    const widgetData = {
      id: "preview-widget",
      title: formData.title,
      description: formData.description,
      cta_text: formData.cta_text,
      cta_type: formData.cta_type,
      image_type: imageType,
      custom_image_url: customImageUrl,
      icon_name: formData.icon_name,
      icon_color: formData.icon_color,
      product_thumbnail_url: productThumbnailUrl,
    };

    return widgetData;
  };

  return (
    <div className="fixed-aside" style={{ display: "contents" }}>
      <header className="sticky-top">
        <h1>{view === "edit" ? "Edit widget" : "Create widget"}</h1>
        <div className="actions">
          <Button onClick={onClose} disabled={isSubmitting}>
            <Icon name="x-square" />
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={(e) => {
              handleSubmit(e);
            }}
            disabled={isSubmitting}
          >
            Save
          </Button>
          <Button
            color="accent"
            onClick={(e) => {
              handleSubmit(e);
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </header>
      <main className="squished">
        <form
          onSubmit={(e) => {
            handleSubmit(e);
          }}
        >
          <section>
            <fieldset>
              <legend>
                <label htmlFor={`${uid}-name`}>Widget name</label>
              </legend>
              <input
                id={`${uid}-name`}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Community members"
                required
                maxLength={255}
              />
            </fieldset>

            <fieldset>
              <legend>
                <label htmlFor={`${uid}-products`}>Products</label>
              </legend>
              <Select
                inputId={`${uid}-products`}
                instanceId={`${uid}-products`}
                options={products.map(({ id, name: label }) => ({ id, label }))}
                value={products
                  .filter(({ id }) => formData.link_ids.includes(id))
                  .map(({ id, name }) => ({ id, label: name }))}
                onChange={(selectedOptions) =>
                  setFormData((prev) => ({ ...prev, link_ids: selectedOptions.map(({ id }) => id) }))
                }
                isDisabled={formData.universal}
                isMulti
                isClearable
                placeholder="Select products to display this widget"
              />
              <label>
                <input
                  type="checkbox"
                  checked={formData.universal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, universal: e.target.checked }))}
                />
                All products
              </label>
            </fieldset>
          </section>

          <section>
            <header>
              <h3>Message</h3>
              <p>
                Click on the buttons below to quickly add them to your title, description, or call to action. This will
                dynamically update your widget.
              </p>
            </header>

            <fieldset>
              <legend>
                <label htmlFor={`${uid}-title`}>Title</label>
              </legend>
              <input
                id={`${uid}-title`}
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                onFocus={() => setFocusedField("title")}
                onBlur={() => setFocusedField(null)}
                placeholder="Join {{total_sales}} members today!"
                maxLength={500}
                className={validationErrors.title && validationErrors.title.length > 0 ? "error" : ""}
              />
              {validationErrors.title && validationErrors.title.length > 0 ? (
                <div className="field-errors">
                  {validationErrors.title.map((error, index) => (
                    <div key={index} className="error-message">
                      {error}
                    </div>
                  ))}
                </div>
              ) : null}
              {focusedField === "title" && <VariableInsertionButtons onInsertVariable={handleInsertVariable} />}
            </fieldset>

            <fieldset>
              <legend>
                <label htmlFor={`${uid}-description`}>Description</label>
              </legend>
              <textarea
                id={`${uid}-description`}
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                onFocus={() => setFocusedField("description")}
                onBlur={() => setFocusedField(null)}
                placeholder="Get lifetime access to the {{product_name}} and start your entrepreneurial journey now."
                maxLength={1000}
                rows={3}
                className={validationErrors.description && validationErrors.description.length > 0 ? "error" : ""}
              />
              {validationErrors.description && validationErrors.description.length > 0 ? (
                <div className="field-errors">
                  {validationErrors.description.map((error, index) => (
                    <div key={index} className="error-message">
                      {error}
                    </div>
                  ))}
                </div>
              ) : null}
              {focusedField === "description" && <VariableInsertionButtons onInsertVariable={handleInsertVariable} />}
            </fieldset>

            <fieldset>
              <legend>
                <label htmlFor={`${uid}-cta_text`}>Call to action text</label>
              </legend>
              <input
                id={`${uid}-cta_text`}
                type="text"
                value={formData.cta_text}
                onChange={(e) => handleFieldChange("cta_text", e.target.value)}
                onFocus={() => setFocusedField("cta_text")}
                onBlur={() => setFocusedField(null)}
                placeholder="Purchase Now - {{price}}"
                maxLength={255}
                className={validationErrors.cta_text && validationErrors.cta_text.length > 0 ? "error" : ""}
              />
              {validationErrors.cta_text && validationErrors.cta_text.length > 0 ? (
                <div className="field-errors">
                  {validationErrors.cta_text.map((error, index) => (
                    <div key={index} className="error-message">
                      {error}
                    </div>
                  ))}
                </div>
              ) : null}
              {focusedField === "cta_text" && <VariableInsertionButtons onInsertVariable={handleInsertVariable} />}
            </fieldset>

            <fieldset>
              <legend>
                <label htmlFor={`${uid}-cta_type`}>Call to action</label>
              </legend>
              <TypeSafeOptionSelect
                id={`${uid}-cta_type`}
                value={formData.cta_type}
                options={CTA_TYPE_OPTIONS}
                onChange={(value) => setFormData((prev) => ({ ...prev, cta_type: value }))}
              />
            </fieldset>
          </section>

          <section>
            <header>
              <h3>Image</h3>
            </header>

            <fieldset>
              <legend>
                <label htmlFor={`${uid}-image_type`}>Image source</label>
              </legend>
              <TypeSafeOptionSelect
                id={`${uid}-image_type`}
                value={formData.image_type}
                options={IMAGE_TYPE_OPTIONS}
                onChange={(value) => setFormData((prev) => ({ ...prev, image_type: value }))}
              />
            </fieldset>

            {formData.image_type === "custom_image" && (
              <fieldset>
                <ImageUploader
                  id="custom_image"
                  helpText="Your image should be square, at least 600x600px, and JPG, PNG or GIF format."
                  imageUrl={formData.custom_image_url || null}
                  allowedExtensions={["jpg", "jpeg", "png", "gif"]}
                  onSelectFile={async (file: File) => {
                    // TODO: Implement file upload to S3 or similar
                    // For now, create a temporary URL for preview
                    const imageUrl = URL.createObjectURL(file);
                    setFormData((prev) => ({ ...prev, custom_image_url: imageUrl }));
                  }}
                  onRemove={() => {
                    setFormData((prev) => ({ ...prev, custom_image_url: "" }));
                  }}
                  imageAlt="Custom widget image"
                  disabled={isSubmitting}
                />
              </fieldset>
            )}

            {formData.image_type === "icon" && (
              <>
                <fieldset>
                  <div
                    className="radio-buttons"
                    role="radiogroup"
                    aria-label="Select icon"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(10, 1fr)",
                      gap: "var(--spacer-2)",
                      marginBottom: "var(--spacer-3)",
                    }}
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <Button
                        key={icon.id}
                        role="radio"
                        aria-checked={formData.icon_name === icon.icon_name}
                        aria-label={icon.label}
                        onClick={() => setFormData((prev) => ({ ...prev, icon_name: icon.icon_name }))}
                        className={cx("icon-select-button", formData.icon_name === icon.icon_name && "selected")}
                        style={{
                          width: "48px",
                          height: "48px",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name={icon.icon_name} style={{ color: "#000000", fontSize: "20px" }} />
                      </Button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Icon color</legend>
                  <div className="color-picker">
                    <input
                      id={`${uid}-icon_color`}
                      type="color"
                      value={formData.icon_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, icon_color: e.target.value }))}
                    />
                  </div>
                </fieldset>
              </>
            )}
          </section>
        </form>
      </main>
      <aside aria-label="Preview">
        <header>
          <h2>Preview</h2>
        </header>
        <div
          style={{
            border: "var(--border)",
            borderRadius: "var(--border-radius-2)",
            backgroundColor: "rgb(var(--filled))",
            margin: "var(--spacer-4)",
            overflow: "hidden",
          }}
        >
          <Preview scaleFactor={0.8}>
            {formData.title || formData.description || formData.cta_text ? (
              <div
                style={{
                  position: "relative",
                  width: "400px",
                  height: "300px",
                  backgroundColor: "rgb(var(--page-background))",
                  padding: "var(--spacer-4)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "20px",
                    maxWidth: "360px",
                  }}
                >
                  <SocialProofWidget
                    widget={getPreviewWidgetData()}
                    productData={getPreviewProductData()}
                    disableAnalytics
                    className="preview-mode"
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "var(--spacer-4)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                Your widget preview will appear here
              </div>
            )}
          </Preview>
        </div>
      </aside>
    </div>
  );
};

export default register({ component: SocialProofWidgetsPage, propParser: createCast() });
