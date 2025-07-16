import { DirectUpload } from "@rails/activestorage";
import cx from "classnames";
import * as React from "react";
import { createCast } from "ts-safe-cast";

import {
  createSocialProofWidget,
  updateSocialProofWidget,
  deleteSocialProofWidget,
  publishSocialProofWidget,
  unpublishSocialProofWidget,
  duplicateSocialProofWidget,
  getPagedSocialProofWidgets,
  SocialProofWidgetPayload,
  SocialProofWidget as SocialProofWidgetType,
} from "$app/data/socialProofWidgets";
import { ALLOWED_EXTENSIONS } from "$app/utils/file";
import { asyncVoid } from "$app/utils/promise";
import { request, AbortError, assertResponseError } from "$app/utils/request";
import { register } from "$app/utils/serverComponentUtil";
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
import { SocialProofWidget, SocialProofWidgetData } from "$app/components/SocialProofWidget";
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
  onPublishToggle,
}: {
  widget: SocialProofWidget;
  onDuplicate: () => void;
  onDelete: () => void;
  onPublishToggle: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
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

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    try {
      if (widget.published) {
        await unpublishSocialProofWidget(widget.id);
        showAlert("Widget unpublished successfully", "success");
      } else {
        await publishSocialProofWidget(widget.id);
        showAlert("Widget published successfully", "success");
      }
      onPublishToggle();
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
    } finally {
      setIsPublishing(false);
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
          <div
            role="menuitem"
            inert={!widget.can_update || isPublishing}
            onClick={(e) => {
              e.stopPropagation();
              void handlePublishToggle();
            }}
          >
            <Icon name={widget.published ? "x-circle" : "eye-fill"} />
            &ensp;
            {isPublishing
              ? widget.published
                ? "Unpublishing..."
                : "Publishing..."
              : widget.published
                ? "Unpublish"
                : "Publish"}
          </div>
          <div
            role="menuitem"
            inert={!widget.can_update || isDuplicating}
            onClick={(e) => {
              e.stopPropagation();
              void handleDuplicate();
            }}
          >
            <Icon name="outline-duplicate" />
            &ensp;{isDuplicating ? "Duplicating..." : "Duplicate"}
          </div>
          <div
            className="danger"
            inert={!widget.can_destroy || isDeleting}
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
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
              <Button onClick={() => setConfirmingDelete(false)} disabled={isDeleting || isDuplicating || isPublishing}>
                Cancel
              </Button>
              <Button
                color="danger"
                onClick={() => void handleDelete()}
                disabled={isDeleting || isDuplicating || isPublishing}
              >
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
  const [selectedWidgetId, setSelectedWidgetId] = React.useState<string | null>(null);
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
    setSelectedWidgetId(null);
    setView("create");
  };

  const selectedWidget = selectedWidgetId ? widgetsList.find((w) => w.id === selectedWidgetId) : null;

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
                    const url = new URL(window.location.href);
                    const updatedUrl = writeQueryParams(url, { search: searchTerm || null });
                    window.history.pushState({}, "", updatedUrl.toString());
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
                  <tr
                    key={widget.id}
                    onClick={() => setSelectedWidgetId(widget.id)}
                    style={{ cursor: "pointer" }}
                    className={selectedWidgetId === widget.id ? "selected" : ""}
                  >
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
                    <td style={{ width: "12%", textAlign: "center" }}>
                      {widget.analytics.attributed_revenue_formatted || "$0"}
                    </td>
                    <td style={{ width: "12%" }}>
                      {widget.published ? (
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
                          onPublishToggle={() => {
                            loadWidgets(1, searchTerm);
                          }}
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

        {selectedWidget ? (
          <WidgetDrawer
            widget={selectedWidget}
            onClose={() => setSelectedWidgetId(null)}
            onEdit={() => {
              setEditingWidget(selectedWidget);
              setSelectedWidgetId(null);
              setView("edit");
            }}
            onDuplicate={() => {
              loadWidgets(1, searchTerm);
            }}
            onDelete={() => {
              setSelectedWidgetId(null);
              loadWidgets(1, searchTerm);
            }}
          />
        ) : null}
      </section>
    </Layout>
  ) : (
    <WidgetFormModal
      widget={editingWidget}
      products={products}
      view={view}
      onClose={() => {
        setView("list");
        setSelectedWidgetId(null);
      }}
      onSave={() => {
        // Refresh the widgets list after successful save
        loadWidgets(1, searchTerm);
        setSelectedWidgetId(null);
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
    widget_type: "purchases" | "memberships";
    title: string;
    message_end: string;
    cta_text: string;
    cta_type: "button" | "link" | "none";
    image_type: "product_thumbnail" | "custom_image" | "icon" | "none";
    icon_name: SocialProofWidgetIconType;
    icon_color: string;
    custom_image_url: string;
    published: boolean;
    link_ids: string[];
  }>({
    name: widget?.name || "",
    universal: widget?.universal || false,
    widget_type: widget?.widget_type || "purchases",
    title: widget?.title || "",
    message_end: widget?.message_end || "",
    cta_text: widget?.cta_text || "Buy now",
    cta_type: widget?.cta_type ?? "button",
    image_type: widget?.image_type ?? "icon",
    icon_name: widget?.icon_name || "flame-fill",
    icon_color: widget?.icon_color || "#14b8a6",
    custom_image_url: widget?.custom_image_url || "",
    published: widget?.published ?? false,
    link_ids: widget?.products?.map((p) => p.id) || [],
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [imagesUploading, setImagesUploading] = React.useState<Set<File>>(new Set());
  const uid = React.useId();

  // Template validation helpers

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const createPayload = (data: typeof formData): SocialProofWidgetPayload => {
    return {
      name: data.name,
      universal: data.universal,
      widget_type: data.widget_type,
      title: data.title,
      message_end: data.message_end,
      cta_text: data.cta_text,
      cta_type: data.cta_type,
      image_type: data.image_type,
      published: data.published,
      link_ids: data.universal ? [] : data.link_ids,
      ...(data.image_type === "custom_image" &&
        data.custom_image_url && { custom_image_url: data.custom_image_url }),
      ...(data.image_type === "icon" && { icon_name: data.icon_name }),
      ...(data.image_type === "icon" && { icon_color: data.icon_color }),
    };
  };

  const handleSave = asyncVoid(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = createPayload(formData);

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
      const payload = createPayload(formData);

      let widgetId: string;
      if (widget) {
        await updateSocialProofWidget(widget.id, payload);
        widgetId = widget.id;
      } else {
        const newWidget = await createSocialProofWidget(payload);
        widgetId = newWidget.id;
      }

      // Then publish or unpublish based on current state
      if (formData.published) {
        await unpublishSocialProofWidget(widgetId);
        showAlert("Widget unpublished successfully", "success");
      } else {
        await publishSocialProofWidget(widgetId);
        showAlert("Widget published successfully", "success");
      }
      onSave();
    } catch (e) {
      assertResponseError(e);
      showAlert(`Failed to ${formData.published ? "unpublish" : "publish"} widget: ${e.message}`, "error");
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
      sales_count: previewProduct?.sales_count || 1247,
      members_count: 234, // Mock value - subscription data not available in admin dashboard context
      thumbnail_url: previewProduct?.thumbnail_url || "https://via.placeholder.com/48x48/4ecdc4/ffffff?text=📦",
    };
  };

  const getPreviewWidgetData = () => {
    // Get the image type and related data
    const imageType = formData.image_type;

    const widgetData: SocialProofWidgetData = {
      id: "preview-widget",
      widget_type: formData.widget_type,
      title: formData.title,
      message_end: formData.message_end,
      cta_text: formData.cta_text,
      cta_type: formData.cta_type,
      image_type: imageType,
      number: formData.widget_type === "purchases" ? 47 : 1234,
      number_text: formData.widget_type === "purchases" ? "" : "members and get new content every month",
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
              {isPublishing
                ? formData.published
                  ? "Unpublishing..."
                  : "Publishing..."
                : formData.published
                  ? "Unpublish"
                  : "Publish"}
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
                <p>Create a simple message that will encourage customers to purchase your product.</p>
              </header>

              <fieldset>
                <legend>Widget type</legend>
                <div
                  className="radio-buttons"
                  role="radiogroup"
                  aria-label="Select widget type"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "var(--spacer-2)",
                    marginBottom: "var(--spacer-3)",
                  }}
                >
                  <Button
                    role="radio"
                    aria-checked={formData.widget_type === "purchases"}
                    onClick={() => setFormData((prev) => ({ ...prev, widget_type: "purchases" }))}
                    className={cx("toggle-button", formData.widget_type === "purchases" && "selected")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--spacer-2)",
                      padding: "var(--spacer-3)",
                    }}
                  >
                    <Icon name="cart3-fill" />
                    Purchases
                  </Button>
                  <Button
                    role="radio"
                    aria-checked={formData.widget_type === "memberships"}
                    onClick={() => setFormData((prev) => ({ ...prev, widget_type: "memberships" }))}
                    className={cx("toggle-button", formData.widget_type === "memberships" && "selected")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--spacer-2)",
                      padding: "var(--spacer-3)",
                    }}
                  >
                    <Icon name="people-fill" />
                    Memberships
                  </Button>
                </div>
              </fieldset>

              <fieldset>
                <legend>
                  <label htmlFor={`${uid}-title`}>Title</label>
                </legend>
                <input
                  id={`${uid}-title`}
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  maxLength={500}
                  className=""
                />
              </fieldset>

              <fieldset>
                <legend>
                  <label htmlFor={`${uid}-message_end`}>End of message</label>
                </legend>
                <textarea
                  id={`${uid}-message_end`}
                  value={formData.message_end}
                  onChange={(e) => handleFieldChange("message_end", e.target.value)}
                  maxLength={200}
                  rows={2}
                  className=""
                />
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
                  placeholder="Purchase Now - {{price}}"
                  maxLength={255}
                  className=""
                />
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
                        showAlert("Failed to upload image. Please try again.", "error");
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
            </Preview>
          </div>
        </aside>
      </div>
    </ImageUploadSettingsContext.Provider>
  );
};

// Widget Drawer Component
const WidgetDrawer = ({
  widget,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  widget: SocialProofWidget;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const handleDuplicate = asyncVoid(async () => {
    try {
      setIsDuplicating(true);
      await duplicateSocialProofWidget(widget.id);
      onDuplicate();
      setIsDuplicating(false);
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
      setIsDuplicating(false);
    }
  });

  const handleDelete = asyncVoid(async () => {
    try {
      setIsDeleting(true);
      await deleteSocialProofWidget(widget.id);
      onDelete();
      setIsDeleting(false);
    } catch (e) {
      assertResponseError(e);
      showAlert(e.message, "error");
      setIsDeleting(false);
    }
  });

  return (
    <aside style={{ width: "30%", minWidth: "450px" }}>
      <header>
        <h2>{widget.name}</h2>
        <button className="close" aria-label="Close" onClick={onClose} />
      </header>

      <section
        style={{ display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "auto auto", gap: "var(--spacer-5)" }}
      >
        <section style={{ border: "var(--border)", borderRadius: "var(--border-radius)" }}>
          <div>
            <div
              style={{
                padding: "var(--spacer-3)",
                paddingBottom: "var(--spacer-2)",
                borderBottom: "var(--border)",
                marginBottom: "var(--spacer-3)",
              }}
            >
              <h3 style={{ margin: 0 }}>Details</h3>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 var(--spacer-3)",
                paddingBottom: "var(--spacer-2)",
                borderBottom: "var(--border)",
                marginBottom: "var(--spacer-2)",
              }}
            >
              <div>Impressions:</div>
              <div>{widget.analytics.impressions.toLocaleString()}</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 var(--spacer-3)",
                paddingBottom: "var(--spacer-2)",
                borderBottom: "var(--border)",
                marginBottom: "var(--spacer-2)",
              }}
            >
              <div>Clicks:</div>
              <div>{widget.analytics.clicks.toLocaleString()}</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 var(--spacer-3)",
                paddingBottom: "var(--spacer-2)",
                borderBottom: "var(--border)",
                marginBottom: "var(--spacer-2)",
              }}
            >
              <div>Closes:</div>
              <div>{widget.analytics.closes.toLocaleString()}</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 var(--spacer-3)",
                paddingBottom: "var(--spacer-2)",
                borderBottom: "var(--border)",
                marginBottom: "var(--spacer-2)",
              }}
            >
              <div>Conversion:</div>
              <div>{widget.analytics.conversion_rate}%</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 var(--spacer-3)",
                paddingBottom: "var(--spacer-2)",
              }}
            >
              <div>Revenue:</div>
              <div>{widget.analytics.attributed_revenue_formatted || "$0"}</div>
            </div>
          </div>
        </section>

        <section style={{ border: "var(--border)", borderRadius: "var(--border-radius)" }}>
          <div
            style={{
              padding: "var(--spacer-3)",
              paddingBottom: "var(--spacer-2)",
              borderBottom: "var(--border)",
              marginBottom: "var(--spacer-3)",
            }}
          >
            <h3 style={{ margin: 0 }}>Products</h3>
          </div>
          <div style={{ padding: "0 var(--spacer-3)", paddingBottom: "var(--spacer-3)" }}>
            {widget.universal ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--spacer-2)" }}>
                <Icon name="globe" />
                <span>This widget appears on all your products</span>
              </div>
            ) : (
              <div>
                {widget.products && widget.products.length > 0 ? (
                  <div>
                    {widget.products.map((product) => (
                      <div key={product.id} style={{ marginBottom: "var(--spacer-1)" }}>
                        <strong>{product.name}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>No products selected</p>
                )}
              </div>
            )}
          </div>
        </section>
      </section>

      <section style={{ marginTop: "auto", paddingTop: "var(--spacer-4)" }}>
        <div className="button-group" style={{ display: "flex", gap: "var(--spacer-2)" }}>
          <Button onClick={onEdit} disabled={!widget.can_update} style={{ flex: 1 }}>
            Edit
          </Button>
          <Button onClick={handleDuplicate} disabled={isDuplicating} style={{ flex: 1 }}>
            {isDuplicating ? "Duplicating..." : "Duplicate"}
          </Button>
          <Button onClick={handleDelete} disabled={isDeleting} color="danger" style={{ flex: 1 }}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </section>
    </aside>
  );
};

export default register({
  component: SocialProofWidgetsPage,
  propParser: createCast<SocialProofWidgetsPageProps>(),
});
