import cx from "classnames";
import * as React from "react";

import { request } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";

export type SocialProofWidgetData = {
  id: string;
  widget_type: "purchases" | "memberships";
  title: string | null; // Optional field (max 50 chars)
  message_end: string | null; // Optional field (max 200 chars)
  cta_text: string | null; // Can be null when cta_type is "none"
  cta_type: "button" | "link" | "none";
  image_type: string;
  custom_image_url?: string; // Only when image_type is "custom_image"
  icon_name?: SocialProofWidgetIconType; // Only when image_type is "icon"
  icon_color?: string; // Only when image_type is "icon"
  number: number; // Calculated number (purchases or memberships)
  number_text: string; // Description of the number
  product_data?: {
    sales_count: number;
    members_count: number;
    thumbnail_url?: string;
  } | null;
};

type SocialProofWidgetProps = {
  widget: SocialProofWidgetData;
  productData?:
    | {
        sales_count: number;
        members_count: number;
        thumbnail_url?: string;
      }
    | undefined;
  onAction?: (() => void) | undefined;
  className?: string;
  disableAnalytics?: boolean;
};

export const SocialProofWidget: React.FC<SocialProofWidgetProps> = ({
  widget,
  productData,
  onAction,
  className,
  disableAnalytics = false,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const widgetRef = React.useRef<HTMLDivElement>(null);
  const impressionTrackedRef = React.useRef(false);

  // Track analytics
  React.useEffect(() => {
    if (isVisible && !hasAnimated && !disableAnalytics && !impressionTrackedRef.current) {
      setHasAnimated(true);
      impressionTrackedRef.current = true;
      // Track impression
      void trackWidgetImpression(widget.id);
    }
  }, [isVisible, hasAnimated, widget.id, disableAnalytics]);

  const handleClose = () => {
    if (!disableAnalytics) {
      void trackWidgetClose(widget.id);
    }
    setIsVisible(false);
  };

  const handleAction = () => {
    if (!disableAnalytics) {
      void trackWidgetClick(widget.id);
    }
    onAction?.();
  };

  const processedContent = React.useMemo(() => {
    // Build the widget message based on widget type
    const buildWidgetMessage = () => {
      const parts = [];

      if (widget.widget_type === "purchases") {
        // For purchases: "[number] people bought this product in the last 24 hours. [custom_end]"
        parts.push(`${widget.number} people bought this product in the last 24 hours.`);
      } else if (widget.widget_type === "memberships") {
        // For memberships: "Become one of the [number] members and get new content every month [custom_end]"
        parts.push(`Become one of the ${widget.number} members and get new content every month`);
      }

      if (widget.message_end) {
        parts.push(widget.message_end);
      }

      return parts.join(" ").trim();
    };

    return {
      title: widget.title,
      description: buildWidgetMessage(),
      cta_text: widget.cta_text,
    };
  }, [widget]);

  const renderImage = () => {
    if (widget.image_type === "custom_image" && widget.custom_image_url) {
      return <img src={widget.custom_image_url} alt="" className="widget-image" />;
    }

    if (widget.image_type === "product_thumbnail" && productData?.thumbnail_url) {
      return <img src={productData.thumbnail_url} alt="" className="widget-image" />;
    }

    if (widget.image_type === "icon" && widget.icon_name) {
      const iconColor = widget.icon_color || "#6b7280";

      // Convert hex to rgba with 15% opacity for background
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      return (
        <div
          className={`widget-icon ${widget.icon_color ? "widget-icon--custom-color" : ""}`}
          style={{
            backgroundColor: widget.icon_color ? hexToRgba(iconColor, 0.15) : "#f3f4f6",
            borderColor: "#000000",
            width: "48px",
            height: "48px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={widget.icon_name} className="widget-icon__svg" style={{ color: iconColor }} />
        </div>
      );
    }

    if (widget.image_type === "none") {
      return null;
    }

    return null;
  };

  const renderCTA = () => {
    if (widget.cta_type === "none" || !processedContent.cta_text) return null;

    if (widget.cta_type === "button") {
      return (
        <Button 
          onClick={handleAction} 
          color="success" 
          small 
          className="widget-cta-button"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          {processedContent.cta_text}
        </Button>
      );
    }

    // widget.cta_type === "link"
    return (
      <button onClick={handleAction} className="widget-cta-link">
        {processedContent.cta_text}
      </button>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={widgetRef}
      className={cx(
        "social-proof-widget",
        {
          "social-proof-widget--animated": hasAnimated,
          "social-proof-widget--with-image": widget.image_type !== "none",
        },
        className,
      )}
      style={{
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        position: "relative",
        maxWidth: "320px",
        fontSize: "14px",
        lineHeight: "1.4",
      }}
    >
      <button 
        onClick={handleClose} 
        className="social-proof-widget__close" 
        aria-label="Close"
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#9ca3af",
          fontSize: "16px",
          padding: "2px",
        }}
      >
        <Icon name="x" />
      </button>

      <div 
        className="social-proof-widget__content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div 
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          {renderImage()}

          <div 
            className="social-proof-widget__text"
            style={{
              flex: "1",
              minWidth: "0",
              paddingRight: "24px",
            }}
          >
            {processedContent.title ? (
              <h4 
                className="social-proof-widget__title"
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {processedContent.title}
              </h4>
            ) : null}

            {processedContent.description ? (
              <p 
                className="social-proof-widget__description"
                style={{
                  margin: "0",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                {processedContent.description}
              </p>
            ) : null}

            {widget.cta_type === "link" && renderCTA()}
          </div>
        </div>

        {widget.cta_type === "button" && (
          <div style={{ width: "100%", boxSizing: "border-box" }}>
            {renderCTA()}
          </div>
        )}
      </div>
    </div>
  );
};

// Analytics tracking functions
const trackWidgetImpression = async (widgetId: string) => {
  try {
    await request({
      method: "POST",
      url: `/social_proof_widgets/${widgetId}/impression`,
      accept: "json",
    });
  } catch (_error) {
    // Track error silently - don't block user experience
  }
};

const trackWidgetClick = async (widgetId: string) => {
  try {
    await request({
      method: "POST",
      url: `/social_proof_widgets/${widgetId}/click`,
      accept: "json",
    });
  } catch (error) {
    // Track error silently - don't block user experience
    console.warn('Social proof widget click tracking failed:', error);
  }
};

const trackWidgetClose = async (widgetId: string) => {
  try {
    await request({
      method: "POST",
      url: `/social_proof_widgets/${widgetId}/close`,
      accept: "json",
    });
  } catch (_error) {
    // Track error silently - don't block user experience
  }
};

// Container component for multiple widgets with display logic
export const SocialProofWidgetContainer: React.FC<{
  widgets: SocialProofWidgetData[];
  productData?: {
    sales_count: number;
    members_count: number;
    thumbnail_url?: string;
  };
  onAction?: (() => void) | undefined;
}> = ({ widgets, productData, onAction }) => {
  const [selectedWidget] = React.useState(() => {
    if (widgets.length === 0) return null;
    // the structure allows for multiple widgets to be passed to the client
    // so we can randomly select one or change the implementation as per future needs
    // Right now we are always sending only one widget in the array
    return widgets[Math.floor(Math.random() * widgets.length)];
  });

  if (widgets.length === 0 || !selectedWidget) return null;

  return (
    <div className="social-proof-widget-container">
      <SocialProofWidget
        widget={selectedWidget}
        productData={productData}
        onAction={onAction}
        disableAnalytics={false}
      />
    </div>
  );
};
