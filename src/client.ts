/**
 * HTTP Client giao tiếp với WordPress REST API (/wp-json/wp/v2)
 */
import { config } from './config.js';
import type { ApiResponse } from './types.js';

export class WordPressApiClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly appPassword: string;

  constructor(
    wpUrl: string = config.wpUrl,
    username: string = config.wpUsername,
    appPassword: string = config.wpAppPassword
  ) {
    const cleanUrl = wpUrl.replace(/\/+$/, '');
    if (cleanUrl.endsWith('/wp-json/wp/v2')) {
      this.baseUrl = cleanUrl;
    } else if (cleanUrl.endsWith('/wp-json')) {
      this.baseUrl = `${cleanUrl}/wp/v2`;
    } else {
      this.baseUrl = `${cleanUrl}/wp-json/wp/v2`;
    }
    this.username = username;
    this.appPassword = appPassword;
  }

  /**
   * Tạo headers chung cho request bao gồm Basic Auth nếu có credentials
   */
  private getHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.username && this.appPassword) {
      const credentials = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  /**
   * Xử lý gọi WordPress REST API tổng quát
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    let url = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;

    if (queryParams) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    try {
      const isRawBody = body instanceof Uint8Array || body instanceof Buffer;
      const headers = this.getHeaders(customHeaders);
      if (isRawBody && customHeaders?.['Content-Type']) {
        // Giữ nguyên Content-Type cho upload raw binary
      }

      const response = await fetch(url, {
        method,
        headers,
        body: isRawBody ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
      });

      const totalHeader = response.headers.get('x-wp-total');
      const totalPagesHeader = response.headers.get('x-wp-totalpages');
      const total = totalHeader ? parseInt(totalHeader, 10) : undefined;
      const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : undefined;

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const errorObj = json as { code?: string; message?: string; data?: unknown } | null;
        return {
          status: 'error',
          error_code: errorObj?.code || `HTTP_${response.status}`,
          message: errorObj?.message || `Lỗi yêu cầu HTTP ${response.status}: ${response.statusText}`,
          details: errorObj?.data,
        };
      }

      return {
        status: 'success',
        data: json as T,
        total,
        totalPages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      return {
        status: 'error',
        error_code: 'CLIENT_NETWORK_ERROR',
        message: `Lỗi kết nối tới WordPress REST API (${url}): ${message}`,
      };
    }
  }

  // Tiện ích HTTP cơ bản
  get<T>(endpoint: string, queryParams?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>('GET', endpoint, undefined, queryParams);
  }

  post<T>(endpoint: string, body?: unknown, queryParams?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>('POST', endpoint, body, queryParams);
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>('PUT', endpoint, body);
  }

  delete<T>(endpoint: string, queryParams?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>('DELETE', endpoint, undefined, queryParams);
  }

  /**
   * Upload tệp media dạng binary lên WordPress
   */
  async uploadMedia<T>(
    fileBuffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    const customHeaders: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    };
    return this.request<T>('POST', 'media', fileBuffer, queryParams, customHeaders);
  }
}

// Singleton client dùng chung
export const apiClient = new WordPressApiClient();
