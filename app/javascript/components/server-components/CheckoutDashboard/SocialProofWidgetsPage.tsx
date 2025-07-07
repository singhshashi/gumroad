import { DirectUpload } from "@rails/activestorage";
import cx from "classnames";
import * as React from "react";
import { createCast } from "ts-safe-cast";

import {
  createSocialProofWidget,
  updateSocialProofWidget,
  deleteSocialProofWidget,
  publishSocialProofWidget,
  duplicateSocialProofWidget,
  getPagedSocialProofWidgets,
  SocialProofWidgetPayload,
  SocialProofWidget as SocialProofWidgetType,
} from "$app/data/socialProofWidgets";
import { ALLOWED_EXTENSIONS } from "$app/utils/file";
import { asyncVoid } from "$app/utils/promise";
import { request, AbortError, assertResponseError } from "$app/utils/request";
import { register } from "$app/utils/serverComponentUtil";
import {
  SOCIAL_PROOF_TEMPLATE_VARIABLES,
  getAllowedTemplateVariableKeys,
} from "$app/utils/socialProofTemplateVariables";
import { writeQueryParams } from "$app/utils/url";

import { Button } from "$app/components/Button";
import { Layout, Page } from "$app/components/CheckoutDashboard/Layout";
import { Icon } from "$app/components/Icons";
import { ImageUploader } from "$app/components/ImageUploader";
import { Modal } from "$app/components/Modal";
import { Pagination, PaginationProps } from "$app/components/Pagination";
import { Popover } from "$app/components/Popover";
import { Preview } from "$app/components/Preview";
import { ImageUploadSettingsContext } from "$app/components/RichTextEditor";
import { Select } from "$app/components/Select";
import { showAlert } from "$app/components/server-components/Alert";
import { SocialProofWidget } from "$app/components/SocialProofWidget";
import { TypeSafeOptionSelect } from "$app/components/TypeSafeOptionSelect";

import placeholder from "$assets/images/placeholders/social_widgets.png";

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

const VariableInsertionButtons: React.FC<VariableInsertionButtonsProps> = ({ onInsertVariable }) => (
  <div style={{ display: "flex", gap: "var(--spacer-2)", marginTop: "var(--spacer-2)", flexWrap: "wrap" }}>
    {SOCIAL_PROOF_TEMPLATE_VARIABLES.map((item) => (
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

type Product = {
  id: string;
  name: string;
  url: string;
  thumbnail_url?: string | null;
  sales_count: number;
  price: string;
};

type SocialProofWidget = SocialProofWidgetType;

type ImageTypeOption = {
  id: "product_thumbnail" | "custom_image" | "icon" | "none";
  label: string;
};

type IconOption = {
  id: string;
  label: string;
  icon_name: SocialProofWidgetIconType;
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

// Widget Actions Popover Component
const WidgetActionsPopover = ({
  widget,
  onDuplicate,
  onDelete,
}: {
  widget: SocialProofWidget;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      await duplicateSocialProofWidget(widget.id);
      showAlert("Widget duplicated successfully", "success");
      onDuplicate();
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
    } finally {
      setIsDuplicating(false);
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSocialProofWidget(widget.id);
      showAlert("Widget deleted successfully", "success");
      onDelete();
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <Popover open={open} onToggle={setOpen} aria-label="Open widget action menu" trigger={<Icon name="three-dots" />}>
        <div role="menu">
          <div role="menuitem" inert={!widget.can_update || isDuplicating} onClick={() => void handleDuplicate()}>
            <Icon name="outline-duplicate" />
            &ensp;{isDuplicating ? "Duplicating..." : "Duplicate"}
          </div>
          <div
            className="danger"
            inert={!widget.can_destroy || isDeleting}
            role="menuitem"
            onClick={() => setConfirmingDelete(true)}
          >
            <Icon name="trash2" />
            &ensp;{isDeleting ? "Deleting..." : "Delete"}
          </div>
        </div>
      </Popover>
      {confirmingDelete ? (
        <Modal
          open
          onClose={() => setConfirmingDelete(false)}
          title="Delete Widget"
          footer={
            <>
              <Button onClick={() => setConfirmingDelete(false)} disabled={isDeleting || isDuplicating}>
                Cancel
              </Button>
              <Button color="danger" onClick={() => void handleDelete()} disabled={isDeleting || isDuplicating}>
                {isDeleting ? "Deleting..." : "Confirm"}
              </Button>
            </>
          }
        >
          <h4>Are you sure you want to delete "{widget.name}"?</h4>
        </Modal>
      ) : null}
    </>
  );
};

const SocialProofWidgetsPage = ({ widgets, products, pagination, pages }: SocialProofWidgetsPageProps) => {
  const [{ widgets: widgetsList, pagination: currentPagination }, setState] = React.useState({
    widgets,
    pagination,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState<string | null>(null);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = React.useState(false);
  const [view, setView] = React.useState<"list" | "create" | "edit">("list");
  const [editingWidget, setEditingWidget] = React.useState<SocialProofWidget | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const activeRequest = React.useRef<{ cancel: () => void } | null>(null);
  const loadWidgets = asyncVoid(async (page: number, search: string | null) => {
    try {
      activeRequest.current?.cancel();
      setIsLoading(true);

      const request = getPagedSocialProofWidgets(page, search);
      activeRequest.current = request;

      setState(await request.response);
      setIsLoading(false);
      activeRequest.current = null;
    } catch (e) {
      if (e instanceof AbortError) return;
      assertResponseError(e);
      showAlert(e.message, "error");
      setIsLoading(false);
    }
  });

  const handleCreateWidget = () => {
    setEditingWidget(null);
    setView("create");
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
                  setSearchTerm(evt.target.value || null);
                }}
                onKeyDown={(evt) => {
                  if (evt.key === "Enter") {
                    // @ts-expect-error - writeQueryParams type signature issue
                    writeQueryParams({ search: searchTerm || undefined });
                    loadWidgets(1, searchTerm);
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
      <section className="paragraphs">
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
            <table aria-busy={isLoading} aria-label="Social proof widgets">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Widget</th>
                  <th style={{ width: "12%", textAlign: "center" }}>Clicks</th>
                  <th style={{ width: "12%", textAlign: "center" }}>Conversion</th>
                  <th style={{ width: "12%", textAlign: "center" }}>Revenue</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "12%" }}></th>
                </tr>
              </thead>
              <tbody>
                {widgetsList.map((widget) => (
                  <tr key={widget.id}>
                    <td style={{ width: "40%" }}>
                      <div>
                        <div>
                          <b>{widget.name}</b>
                        </div>
                        <small>
                          {widget.universal
                            ? "All products"
                            : `${widget.products?.length || 0} ${widget.products?.length === 1 ? "product" : "products"}`}
                        </small>
                      </div>
                    </td>
                    <td style={{ width: "12%", textAlign: "center" }}>{widget.analytics.clicks}</td>
                    <td style={{ width: "12%", textAlign: "center" }}>{widget.analytics.conversion_rate}%</td>
                    <td style={{ width: "12%", textAlign: "center" }}>$0</td>
                    <td style={{ width: "12%" }}>
                      {widget.enabled ? (
                        <span style={{ color: "var(--success)" }}>Published</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Unpublished</span>
                      )}
                    </td>
                    <td style={{ width: "12%" }}>
                      <div style={{ display: "flex", gap: "var(--spacer-3)", alignItems: "center" }}>
                        <button
                          className="button button--small"
                          onClick={() => {
                            setEditingWidget(widget);
                            setView("edit");
                          }}
                          disabled={!widget.can_update}
                          title="Edit widget"
                        >
                          <Icon name="pencil" />
                        </button>
                        <WidgetActionsPopover
                          widget={widget}
                          onDuplicate={() => {
                            loadWidgets(1, searchTerm);
                          }}
                          onDelete={() => {
                            loadWidgets(1, searchTerm);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentPagination && currentPagination.pages > 1 ? (
              <Pagination pagination={currentPagination} onChangePage={(page) => loadWidgets(page, searchTerm)} />
            ) : null}
          </>
        )}
      </section>
    </Layout>
  ) : (
    <WidgetFormModal
      widget={editingWidget}
      products={products}
      view={view}
      onClose={() => setView("list")}
      onSave={() => {
        // Refresh the widgets list after successful save
        loadWidgets(1, searchTerm);
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
  onSave: () => void;
}) => {
  const [formData, setFormData] = React.useState<{
    name: string;
    universal: boolean;
    title: string;
    description: string;
    cta_text: string;
    cta_type: "button" | "link" | "none";
    image_type: "product_thumbnail" | "custom_image" | "icon" | "none";
    icon_name: SocialProofWidgetIconType;
    icon_color: string;
    custom_image_url: string;
    enabled: boolean;
    link_ids: string[];
  }>({
    name: widget?.name || "",
    universal: widget?.universal || false,
    title: widget?.title || "",
    description: widget?.description || "",
    cta_text: widget?.cta_text || "",
    cta_type: widget?.cta_type ?? "button",
    image_type: widget?.image_type ?? "none",
    icon_name: widget?.icon_name || "flame-fill",
    icon_color: widget?.icon_color || "#D73027",
    custom_image_url: widget?.custom_image_url || "",
    enabled: widget?.enabled ?? false,
    link_ids: widget?.products?.map((p) => p.id) || [],
  });

  const [focusedField, setFocusedField] = React.useState<"title" | "description" | "cta_text" | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string[]>>({});
  const [imagesUploading, setImagesUploading] = React.useState<Set<File>>(new Set());
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
    if (/\{\{\s*\}\}/u.exec(value)) {
      errors.push("Empty template variables not allowed");
    }

    // Check for nested braces
    if (/\{\{[^}]*\{\{/u.exec(value) || /\}\}[^{]*\}\}/u.exec(value)) {
      errors.push("Nested or malformed template braces");
    }

    // Check for invalid variables
    const allowedVariables = getAllowedTemplateVariableKeys();
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

  const handleSave = asyncVoid(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: SocialProofWidgetPayload = {
        name: formData.name,
        universal: formData.universal,
        title: formData.title,
        description: formData.description,
        cta_text: formData.cta_text,
        cta_type: formData.cta_type,
        image_type: formData.image_type,
        enabled: formData.enabled,
        link_ids: formData.link_ids,
        ...(formData.image_type === "custom_image" &&
          formData.custom_image_url && { custom_image_url: formData.custom_image_url }),
        ...(formData.image_type === "icon" && formData.icon_name && { icon_name: formData.icon_name }),
        ...(formData.image_type === "icon" && formData.icon_color && { icon_color: formData.icon_color }),
      };

      if (widget) {
        await updateSocialProofWidget(widget.id, payload);
        showAlert("Widget saved as draft", "success");
      } else {
        await createSocialProofWidget(payload);
        showAlert("Widget created as draft", "success");
      }

      onSave();
    } catch (e) {
      assertResponseError(e);
      const message = view === "edit" ? "Failed to save widget" : "Failed to create widget";
      showAlert(`${message}: ${e.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  });

  const handlePublish = asyncVoid(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);

    try {
      // First save the current changes
      const payload: SocialProofWidgetPayload = {
        name: formData.name,
        universal: formData.universal,
        title: formData.title,
        description: formData.description,
        cta_text: formData.cta_text,
        cta_type: formData.cta_type,
        image_type: formData.image_type,
        enabled: formData.enabled,
        link_ids: formData.link_ids,
        ...(formData.image_type === "custom_image" &&
          formData.custom_image_url && { custom_image_url: formData.custom_image_url }),
        ...(formData.image_type === "icon" && formData.icon_name && { icon_name: formData.icon_name }),
        ...(formData.image_type === "icon" && formData.icon_color && { icon_color: formData.icon_color }),
      };

      let widgetId: string;
      if (widget) {
        await updateSocialProofWidget(widget.id, payload);
        widgetId = widget.id;
      } else {
        const newWidget = await createSocialProofWidget(payload);
        widgetId = newWidget.id;
      }

      // Then publish
      await publishSocialProofWidget(widgetId);
      showAlert("Widget published successfully", "success");
      onSave();
    } catch (e) {
      assertResponseError(e);
      showAlert(`Failed to publish widget: ${e.message}`, "error");
    } finally {
      setIsPublishing(false);
    }
  });

  const getPreviewProductData = () => {
    // For existing widgets, use the widget's associated products
    // For new widgets or universal widgets, use the first available product from all products
    let previewProduct: Product | undefined;

    if (widget && !formData.universal && widget.products && widget.products.length > 0) {
      // Use the first product associated with this widget
      previewProduct = widget.products[0];
    } else if (!formData.universal && formData.link_ids.length > 0) {
      // For new widgets with selected products, find the first selected product
      previewProduct = products.find((p) => formData.link_ids.includes(p.id));
    } else {
      // Fallback to first product from all products for universal widgets or when no products selected
      previewProduct = products[0];
    }

    return {
      name: previewProduct?.name || "Digital Marketing Course",
      price: previewProduct?.price || "$29", // Use actual product price if available
      sales_count: previewProduct?.sales_count || 1247,
      country: "United States",
      customer_name: "Sarah M.", // Would be anonymized as "FirstName L." from recent purchase
      recent_sale_time: "2 hours ago", // Would be time_ago_in_words from recent purchase
      thumbnail_url: previewProduct?.thumbnail_url || "https://via.placeholder.com/48x48/4ecdc4/ffffff?text=📦",
    };
  };

  const getPreviewWidgetData = () => {
    // Get the image type and related data
    const imageType = formData.image_type;

    const widgetData: Partial<SocialProofWidget> = {
      id: "preview-widget",
      title: formData.title,
      description: formData.description,
      cta_text: formData.cta_text,
      cta_type: formData.cta_type,
      image_type: imageType,
    };

    // Only include custom_image_url when image_type is "custom_image"
    if (imageType === "custom_image") {
      widgetData.custom_image_url =
        formData.custom_image_url || "https://via.placeholder.com/48x48/ff6b6b/ffffff?text=📈";
    }

    // Only include icon fields when image_type is "icon"
    if (imageType === "icon") {
      widgetData.icon_name = formData.icon_name;
      widgetData.icon_color = formData.icon_color;
    }

    return widgetData;
  };

  const imageSettings = React.useMemo(
    () => ({
      isUploading: imagesUploading.size > 0,
      onUpload: (file: File) => {
        setImagesUploading((prev) => new Set(prev).add(file));
        return new Promise<string>((resolve, reject) => {
          const upload = new DirectUpload(file, Routes.rails_direct_uploads_path());
          upload.create((error, blob) => {
            setImagesUploading((prev) => {
              const updated = new Set(prev);
              updated.delete(file);
              return updated;
            });

            if (error) {
              reject(error);
            } else {
              request({
                method: "GET",
                accept: "json",
                url: Routes.s3_utility_cdn_url_for_blob_path({ key: blob.key }),
              })
                .then((response) => response.json())
                .then((data: { url: string }) => resolve(data.url))
                .catch((e: unknown) => {
                  assertResponseError(e);
                  reject(e);
                });
            }
          });
        });
      },
      allowedExtensions: ALLOWED_EXTENSIONS,
    }),
    [imagesUploading.size],
  );

  return (
    <ImageUploadSettingsContext.Provider value={imageSettings}>
      <div className="fixed-aside" style={{ display: "contents" }}>
        <header className="sticky-top">
          <h1>{view === "edit" ? "Edit widget" : "Create widget"}</h1>
          <div className="actions">
            <Button onClick={onClose} disabled={isSubmitting || isPublishing}>
              <Icon name="x-square" />
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={(e) => {
                handleSave(e);
              }}
              disabled={isSubmitting || isPublishing}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
            <Button
              color="accent"
              onClick={(e) => {
                handlePublish(e);
              }}
              disabled={isSubmitting || isPublishing}
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </header>
        <main className="squished">
          <form
            onSubmit={(e) => {
              handleSave(e);
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
                  Click on the buttons below to quickly add them to your title, description, or call to action. This
                  will dynamically update your widget.
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
                      try {
                        const imageUrl = await imageSettings.onUpload(file);
                        setFormData((prev) => ({ ...prev, custom_image_url: imageUrl }));
                      } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error("Failed to upload image:", error);
                        // TODO: Show error to user
                      }
                    }}
                    onRemove={() => {
                      setFormData((prev) => ({ ...prev, custom_image_url: "" }));
                    }}
                    imageAlt="Custom widget image"
                    disabled={isSubmitting || imageSettings.isUploading}
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
    </ImageUploadSettingsContext.Provider>
  );
};

export default register({
  component: SocialProofWidgetsPage,
  propParser: createCast<SocialProofWidgetsPageProps>(),
});
