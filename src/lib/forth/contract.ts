/**
 * Designed Lnq ↔ Forth integration API contract.
 *
 * These endpoints are implemented on the Lnq side and consumed by Forth (or vice versa)
 * for identity linking, link unfurling, and webhook-driven notifications.
 */
export const LNQ_FORTH_APIS = {
  identity: 'GET /api/integrations/forth/identity?email=',
  unfurl: 'POST /api/integrations/forth/unfurl',
  webhook: 'POST /api/integrations/forth/webhook',
  link: 'GET /api/integrations/forth/link',
} as const;

export type ForthWebhookEventType =
  | 'task.assigned'
  | 'task.landed'
  | 'task.paused'
  | 'member.invited';

export interface ForthWebhookEvent {
  type: ForthWebhookEventType;
  email: string;
  taskTitle?: string;
  taskUrl?: string;
  workspaceName?: string;
  occurredAt: string;
}

export interface ForthIdentityResponse {
  email: string;
  linked: boolean;
  forthUserId?: string;
  displayName?: string;
}

export interface ForthUnfurlRequest {
  url: string;
}

export interface ForthUnfurlResponse {
  url: string;
  title: string;
  subtitle?: string;
  status?: string;
}

export interface ForthLinkResponse {
  url: string;
  email: string;
}
