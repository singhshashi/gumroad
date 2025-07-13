import { cast } from "ts-safe-cast";

import { request, ResponseError } from "$app/utils/request";

import { PaginationProps } from "$app/components/Pagination";

export type SocialProofWidgetPayload = {
  name: string;
  universal: boolean;
  widget_type: "purchases" | "memberships";
  title: string;
  message_end: string;
  cta_text: string;
  cta_type: "button" | "link" | "none";
  image_type: "product_thumbnail" | "custom_image" | "icon" | "none";
  custom_image_url?: string | null;
  icon_name?: SocialProofWidgetIconType | null;
  icon_color?: string | null;
  enabled: boolean;
  link_ids: string[];
};

export type SocialProofWidget = {
  id: string;
  can_update: boolean;
  can_destroy: boolean;
  name: string;
  universal: boolean;
  widget_type: "purchases" | "memberships";
  title: string;
  message_end: string;
  cta_text: string;
  cta_type: "button" | "link" | "none";
  image_type: "product_thumbnail" | "custom_image" | "icon" | "none";
  custom_image_url?: string | null;
  icon_name?: SocialProofWidgetIconType | null;
  icon_color?: string | null;
  enabled: boolean;
  products?:
    | {
        id: string;
        name: string;
        url: string;
        thumbnail_url?: string | null;
        sales_count: number;
        price: string;
      }[]
    | null;
  analytics: {
    impressions: number;
    clicks: number;
    closes: number;
    conversion_rate: number;
    attributed_revenue_cents: number;
    attributed_revenue_formatted: string;
    attributed_purchases_count: number;
    revenue_per_impression: number;
    revenue_per_click: number;
  };
};

export const createSocialProofWidget = async (payload: SocialProofWidgetPayload) => {
  const response = await request({
    method: "POST",
    accept: "json",
    url: Routes.checkout_social_proof_widgets_path(),
    data: {
      social_proof_widget: {
        name: payload.name,
        universal: payload.universal,
        widget_type: payload.widget_type,
        title: payload.title,
        message_end: payload.message_end,
        cta_text: payload.cta_text,
        cta_type: payload.cta_type,
        image_type: payload.image_type,
        custom_image_url: payload.custom_image_url,
        icon_name: payload.icon_name,
        icon_color: payload.icon_color,
        enabled: payload.enabled,
        link_ids: payload.link_ids,
      },
    },
  });

  const responseData = cast<{ success: true; widget: SocialProofWidget } | { success: false; error: string }>(
    await response.json(),
  );

  if (!responseData.success) throw new ResponseError(responseData.error);

  return responseData.widget;
};

export const updateSocialProofWidget = async (id: string, payload: SocialProofWidgetPayload) => {
  const response = await request({
    method: "PUT",
    accept: "json",
    url: Routes.checkout_social_proof_widget_path(id),
    data: {
      social_proof_widget: {
        name: payload.name,
        universal: payload.universal,
        widget_type: payload.widget_type,
        title: payload.title,
        message_end: payload.message_end,
        cta_text: payload.cta_text,
        cta_type: payload.cta_type,
        image_type: payload.image_type,
        custom_image_url: payload.custom_image_url,
        icon_name: payload.icon_name,
        icon_color: payload.icon_color,
        enabled: payload.enabled,
        link_ids: payload.link_ids,
      },
    },
  });

  const responseData = cast<{ success: true; widget: SocialProofWidget } | { success: false; error: string }>(
    await response.json(),
  );

  if (!responseData.success) throw new ResponseError(responseData.error);

  return responseData.widget;
};

export const deleteSocialProofWidget = async (id: string) => {
  const response = await request({
    method: "DELETE",
    accept: "json",
    url: Routes.checkout_social_proof_widget_path(id),
  });

  if (!response.ok) {
    throw new ResponseError("Failed to delete widget");
  }

  // Delete returns 204 No Content, so no JSON to parse
  return true;
};

export const getPagedSocialProofWidgets = (page: number, search: string | null) => {
  const abort = new AbortController();
  const response = request({
    method: "GET",
    accept: "json",
    url: Routes.paged_checkout_social_proof_widgets_path({ page, search }),
    abortSignal: abort.signal,
  })
    .then((res) => {
      if (!res.ok) throw new ResponseError("Failed to fetch widgets");
      return res.json();
    })
    .then((json) => cast<{ widgets: SocialProofWidget[]; pagination: PaginationProps }>(json));

  return {
    response,
    cancel: () => abort.abort(),
  };
};

export const getSocialProofWidget = async (id: string) => {
  const response = await request({
    method: "GET",
    accept: "json",
    url: Routes.checkout_social_proof_widget_path(id),
  });

  if (!response.ok) {
    throw new ResponseError("Failed to fetch widget");
  }

  return cast<SocialProofWidget>(await response.json());
};

export const getSocialProofWidgetAnalytics = async () => {
  const response = await request({
    method: "GET",
    accept: "json",
    url: Routes.analytics_checkout_social_proof_widgets_path(),
  });

  if (!response.ok) {
    throw new ResponseError("Failed to fetch analytics");
  }

  return cast<{ analytics: SocialProofWidget[] }>(await response.json());
};

export const publishSocialProofWidget = async (id: string) => {
  const response = await request({
    method: "POST",
    accept: "json",
    url: Routes.publish_checkout_social_proof_widget_path(id),
  });

  const responseData = cast<{ success: true; widget: SocialProofWidget } | { success: false; error: string }>(
    await response.json(),
  );

  if (!responseData.success) throw new ResponseError(responseData.error);

  return responseData.widget;
};

export const duplicateSocialProofWidget = async (id: string) => {
  const response = await request({
    method: "POST",
    accept: "json",
    url: Routes.duplicate_checkout_social_proof_widget_path(id),
  });

  const responseData = cast<{ success: true; widget: SocialProofWidget } | { success: false; error: string }>(
    await response.json(),
  );

  if (!responseData.success) throw new ResponseError(responseData.error);

  return responseData.widget;
};
