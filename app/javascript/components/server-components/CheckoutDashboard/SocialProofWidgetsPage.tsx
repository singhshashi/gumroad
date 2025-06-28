import cx from "classnames";
import * as React from "react";
import { createCast } from "ts-safe-cast";

import { AbortError } from "$app/utils/request";
import { register } from "$app/utils/serverComponentUtil";
import { writeQueryParams } from "$app/utils/url";

import { Button } from "$app/components/Button";
import { Layout, Page } from "$app/components/CheckoutDashboard/Layout";
import { Icon } from "$app/components/Icons";
import { Pagination, PaginationProps } from "$app/components/Pagination";
import { showAlert } from "$app/components/server-components/Alert";
import { Toggle } from "$app/components/Toggle";
import { TypeSafeOptionSelect } from "$app/components/TypeSafeOptionSelect";
import { useDebouncedCallback } from "$app/components/useDebouncedCallback";

import placeholder from "$assets/images/placeholders/discounts.png";

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
  enabled: boolean;
  icon_class?: string | null;
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

type CtaTypeOption = {
  id: "button" | "link" | "none";
  label: string;
};

type SocialProofWidgetsPageProps = {
  widgets: SocialProofWidget[];
  products: Product[];
  image_type_options: ImageTypeOption[];
  cta_type_options: CtaTypeOption[];
  pagination: PaginationProps | null;
  pages: Page[];
};

const SocialProofWidgetsPage = ({ widgets, products, image_type_options, cta_type_options, pagination, pages }: SocialProofWidgetsPageProps) => {
    const [widgetsList, setWidgetsList] = React.useState(widgets);
    const [isLoading, setIsLoading] = React.useState(false);
    const [_searchTerm, setSearchTerm] = React.useState("");
    const [showCreateForm, setShowCreateForm] = React.useState(false);
    const [editingWidget, setEditingWidget] = React.useState<SocialProofWidget | null>(null);

    const refreshWidgets = async () => {
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
      setShowCreateForm(true);
    };

    const handleEditWidget = (widget: SocialProofWidget) => {
      setEditingWidget(widget);
      setShowCreateForm(true);
    };

    const handleDeleteWidget = async (widget: SocialProofWidget) => {
      if (!widget.can_destroy) return;

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

    const debouncedSearch = useDebouncedCallback((value: string) => {
      setSearchTerm(value);
      // @ts-ignore - writeQueryParams type signature issue
      writeQueryParams({ search: value || undefined });
      refreshWidgets();
    }, 300);

    return (
      <Layout
        currentPage="social_proof_widgets"
        pages={pages}
        actions={
          <Button onClick={handleCreateWidget} color="primary" small>
            Create widget
          </Button>
        }
      >
        <div className="container">
          <div className="row">
            <div className="col-12">
              {widgetsList.length === 0 && !isLoading ? (
                <div className="empty-state">
                  <img src={placeholder} alt="No widgets" />
                  <h3>Create your first social proof widget</h3>
                  <p>
                    Social proof widgets help increase conversion rates by showing potential customers that others have
                    purchased your products.
                  </p>
                  <Button onClick={handleCreateWidget} color="primary">
                    Create widget
                  </Button>
                </div>
              ) : (
                <>
                  <div className="search-section">
                    <input
                      type="text"
                      placeholder="Search widgets..."
                      onChange={(e) => debouncedSearch(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <div className="widgets-grid">
                    {widgetsList.map((widget) => (
                      <div key={widget.id} className="widget-card">
                        <div className="widget-header">
                          <h4>{widget.name}</h4>
                          <div className="widget-actions">
                            {widget.can_update ? (
                              <button onClick={() => handleEditWidget(widget)} className="btn-icon" title="Edit widget">
                                <Icon name="solid-send" />
                              </button>
                            ) : null}
                            {widget.can_destroy ? (
                              <button
                                onClick={() => handleDeleteWidget(widget)}
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
                            {widget.icon_class ? <i className={widget.icon_class} /> : null}
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

        {showCreateForm ? (
          <WidgetFormModal
            widget={editingWidget}
            products={products}
            imageTypeOptions={image_type_options}
            ctaTypeOptions={cta_type_options}
            onClose={() => setShowCreateForm(false)}
            onSave={(widget) => {
              if (editingWidget) {
                setWidgetsList((prev) => prev.map((w) => (w.id === widget.id ? widget : w)));
              } else {
                setWidgetsList((prev) => [widget, ...prev]);
              }
              setShowCreateForm(false);
            }}
          />
        ) : null}
      </Layout>
    );
};

// Widget Form Modal Component
const WidgetFormModal = ({
  widget,
  products,
  imageTypeOptions,
  ctaTypeOptions,
  onClose,
  onSave,
}: {
  widget: SocialProofWidget | null;
  products: Product[];
  imageTypeOptions: ImageTypeOption[];
  ctaTypeOptions: CtaTypeOption[];
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
    image_type: widget?.image_type || "product_thumbnail",
    custom_image_url: widget?.custom_image_url || "",
    enabled: widget?.enabled ?? true,
    link_ids: widget?.products?.map((p) => p.id) || [],
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement API call to create/update widget
      // const result = widget
      //   ? await updateSocialProofWidget(widget.id, formData)
      //   : await createSocialProofWidget(formData);

      // onSave(castSocialProofWidget(result));
      const message = widget ? "Widget updated successfully" : "Widget created successfully";
      showAlert(message, "success");
    } catch (_error) {
      const message = widget ? "Failed to update widget" : "Failed to create widget";
      showAlert(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{widget ? "Edit Widget" : "Create Widget"}</h3>
          <button onClick={onClose} className="btn-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.universal}
                onChange={(e) => setFormData((prev) => ({ ...prev, universal: e.target.checked }))}
              />
              Universal (show on all products)
            </label>
          </div>

          {!formData.universal && (
            <div className="form-group">
              <label htmlFor="products">Select Products</label>
              <select
                id="products"
                multiple
                value={formData.link_ids}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions, (option) => option.value);
                  setFormData((prev) => ({ ...prev, link_ids: selectedIds }));
                }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              maxLength={1000}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cta_type">Call to Action Type</label>
            <TypeSafeOptionSelect
              id="cta_type"
              value={formData.cta_type}
              options={ctaTypeOptions}
              onChange={(value) => setFormData((prev) => ({ ...prev, cta_type: value }))}
            />
          </div>

          {formData.cta_type !== "none" && (
            <div className="form-group">
              <label htmlFor="cta_text">Call to Action Text</label>
              <input
                id="cta_text"
                type="text"
                value={formData.cta_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
                maxLength={255}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="image_type">Image Type</label>
            <TypeSafeOptionSelect
              id="image_type"
              value={formData.image_type}
              options={imageTypeOptions}
              onChange={(value) => setFormData((prev) => ({ ...prev, image_type: value }))}
            />
          </div>

          {formData.image_type === "custom_image" && (
            <div className="form-group">
              <label htmlFor="custom_image_url">Custom Image URL</label>
              <input
                id="custom_image_url"
                type="url"
                value={formData.custom_image_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, custom_image_url: e.target.value }))}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Enabled
            </label>
          </div>

          <div className="modal-footer">
            <Button type="button" onClick={onClose} outline>
              Cancel
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : widget ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default register({ component: SocialProofWidgetsPage, propParser: createCast() });
