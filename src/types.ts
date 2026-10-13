/**
 * Định nghĩa Types và DTOs cho WordPress REST API & MCP Server
 */

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
  total?: number;
  totalPages?: number;
}

export interface ApiErrorResponse {
  status: 'error';
  error_code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface WpRendered {
  rendered: string;
  raw?: string;
  protected?: boolean;
}

export interface WpPost {
  id: number;
  date: string;
  date_gmt?: string;
  guid?: { rendered: string };
  modified?: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private' | 'trash';
  type: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  author: number;
  featured_media: number;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  sticky?: boolean;
  format?: string;
  categories: number[];
  tags: number[];
  meta?: Record<string, unknown>;
}

export interface WpPage {
  id: number;
  date: string;
  date_gmt?: string;
  modified?: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private' | 'trash';
  type: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  template?: string;
  meta?: Record<string, unknown>;
}

export interface WpMedia {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WpRendered;
  author: number;
  description: WpRendered;
  caption: WpRendered;
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details?: Record<string, unknown>;
  source_url: string;
  post?: number;
}

export interface WpCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: 'category';
  parent: number;
}

export interface WpTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: 'post_tag';
}

export interface WpComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url: string;
  date: string;
  content: WpRendered;
  link: string;
  status: 'approved' | 'hold' | 'spam' | 'trash';
  type: string;
}

export interface WpUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls?: Record<string, string>;
  roles?: string[];
  capabilities?: Record<string, boolean>;
}

export interface WpSystemInfo {
  siteUrl: string;
  restNamespace: string;
  serverName: string;
  serverVersion: string;
  authenticated: boolean;
  currentUser?: string;
}
