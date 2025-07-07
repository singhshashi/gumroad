import cx from "classnames";
import * as React from "react";

import { asyncVoid } from "$app/utils/promise";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";

type SocialProofWidgetData = {
  id: string;
  title?: string;
  description?: string;
  cta_text?: string;
  cta_type: "button" | "link" | "none";
  image_type: string;
  custom_image_url?: string;
  icon_name?: SocialProofWidgetIconType;
  icon_color?: string;
  product_thumbnail_url?: string;
};

type SocialProofWidgetProps = {
  widget: SocialProofWidgetData;
  productData?:
    | {
        name: string;
        price: string;
        sales_count: number;
        country: string;
        customer_name?: string;
        recent_sale_time?: string;
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

  // Track analytics
  React.useEffect(() => {
    if (isVisible && !hasAnimated && !disableAnalytics) {
      setHasAnimated(true);
      // Track impression
      trackWidgetImpression(widget.id);
    }
  }, [isVisible, hasAnimated, widget.id, disableAnalytics]);

  const handleClose = () => {
    if (!disableAnalytics) {
      trackWidgetClose(widget.id);
    }
    setIsVisible(false);
  };

  const handleAction = () => {
    if (!disableAnalytics) {
      trackWidgetClick(widget.id);
    }
    onAction?.();
  };

  const processedContent = React.useMemo(() => {
    if (!productData) return { title: widget.title, description: widget.description };

    const context = {
      product_name: productData.name,
      price: productData.price,
      sales_count: productData.sales_count.toString(),
      total_sales: productData.sales_count.toString(),
      country: productData.country,
      customer_name: productData.customer_name || "Someone",
      recent_sale_time: productData.recent_sale_time || "recently",
    };

    const processTemplate = (template?: string) => {
      if (!template) return template;

      let result = template;
      Object.entries(context).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder.replace(/[{}]/gu, "\\$&"), "gu"), value);
      });
      return result;
    };

    return {
      title: processTemplate(widget.title),
      description: processTemplate(widget.description),
      cta_text: processTemplate(widget.cta_text),
    };
  }, [widget, productData]);

  const renderImage = () => {
    if (widget.image_type === "custom_image" && widget.custom_image_url) {
      return <img src={widget.custom_image_url} alt="" className="widget-image" />;
    }

    if (widget.image_type === "product_thumbnail" && widget.product_thumbnail_url) {
      return <img src={widget.product_thumbnail_url} alt="" className="widget-image" />;
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
        <Button onClick={handleAction} color="success" small className="widget-cta-button">
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
    >
      <button onClick={handleClose} className="social-proof-widget__close" aria-label="Close">
        <Icon name="x" />
      </button>

      <div className="social-proof-widget__content">
        {renderImage()}

        <div className="social-proof-widget__text">
          {processedContent.title ? <h4 className="social-proof-widget__title">{processedContent.title}</h4> : null}

          {processedContent.description ? (
            <p className="social-proof-widget__description">{processedContent.description}</p>
          ) : null}

          {renderCTA()}
        </div>
      </div>
    </div>
  );
};

// Analytics tracking functions
const trackWidgetImpression = (widgetId: string) => {
  asyncVoid(async () => {
    try {
      await fetch(`/internal/social_proof_widgets/${widgetId}/impression`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "",
        },
      });
    } catch (_error) {
      // Track error silently - don't block user experience
    }
  });
};

const trackWidgetClick = (widgetId: string) => {
  asyncVoid(async () => {
    try {
      await fetch(`/internal/social_proof_widgets/${widgetId}/click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "",
        },
      });
    } catch (_error) {
      // Track error silently - don't block user experience
    }
  });
};

const trackWidgetClose = (widgetId: string) => {
  asyncVoid(async () => {
    try {
      await fetch(`/internal/social_proof_widgets/${widgetId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "",
        },
      });
    } catch (_error) {
      // Track error silently - don't block user experience
    }
  });
};

// Container component for multiple widgets with display logic
export const SocialProofWidgetContainer: React.FC<{
  widgets: SocialProofWidgetData[];
  productData?: {
    name: string;
    price: string;
    sales_count: number;
    country: string;
    customer_name?: string;
    recent_sale_time?: string;
  };
  onAction?: (() => void) | undefined;
}> = ({ widgets, productData, onAction }) => {
  const [currentWidgetIndex, setCurrentWidgetIndex] = React.useState(0);
  const [displayedWidgets, setDisplayedWidgets] = React.useState<string[]>([]);

  // Show only one widget at a time, cycling through them
  const currentWidget = widgets[currentWidgetIndex];

  React.useEffect(() => {
    if (widgets.length === 0 || !currentWidget) return;

    // Show the first widget immediately
    if (!displayedWidgets.includes(currentWidget.id)) {
      setDisplayedWidgets((prev) => [...prev, currentWidget.id]);
    }

    // If there are multiple widgets, cycle through them
    if (widgets.length > 1) {
      const timer = setTimeout(() => {
        setCurrentWidgetIndex((prev) => (prev + 1) % widgets.length);
      }, 10000); // Show each widget for 10 seconds

      return () => clearTimeout(timer);
    }
  }, [currentWidgetIndex, widgets, currentWidget?.id, displayedWidgets]);

  if (widgets.length === 0 || !currentWidget) return null;

  return (
    <div className="social-proof-widget-container">
      <SocialProofWidget widget={currentWidget} productData={productData} onAction={onAction} />
    </div>
  );
};
