/**
 * Bộ công cụ quản lý Media cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpMedia } from '../types.js';
import { createFilteredResponse, createCustomResponse } from '../lib/response-filter.js';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

export function registerMediaTools(server: McpServer): void {
  // 1. Danh sách media
  server.tool(
    'wp_media_list',
    'Xem danh sách hình ảnh, video và tệp đính kèm trong thư viện WordPress.',
    {
      search: z.string().max(100).optional().describe('Từ khóa tìm kiếm tệp media'),
      media_type: z.enum(['image', 'video', 'audio', 'application']).optional().describe('Loại tệp media'),
      mime_type: z.string().optional().describe('MIME type cụ thể (ví dụ: image/webp, image/jpeg)'),
      parent: z.number().int().optional().describe('ID bài viết cha chứa tệp media đính kèm'),
      per_page: z.number().int().positive().max(100).optional().describe('Số lượng tệp trên mỗi trang (mặc định 10, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
    },
    async (params) => {
      const res = await apiClient.get<WpMedia[]>('media', params);
      return createFilteredResponse(res, 'media');
    }
  );

  // 2. Chi tiết tệp media
  server.tool(
    'wp_media_get',
    'Lấy chi tiết tệp media, URL gốc và các kích thước ảnh sinh tự động.',
    {
      id: z.number().int().positive().describe('ID của tệp media'),
      context: z.enum(['view', 'edit']).optional().describe('Ngữ cảnh lấy dữ liệu'),
    },
    async ({ id, context }) => {
      const res = await apiClient.get<WpMedia>(`media/${id}`, { context });
      return createFilteredResponse(res, 'media');
    }
  );

  // 3. Tải tệp media lên WordPress
  server.tool(
    'wp_media_upload',
    'Tải một tệp cục bộ lên thư viện Media của WordPress, tự động gắn alt_text, title, caption và liên kết với bài viết.',
    {
      file_path: z.string().min(1).describe('Đường dẫn tệp cục bộ cần tải lên'),
      title: z.string().optional().describe('Tiêu đề tệp media trên WordPress'),
      alt_text: z.string().optional().describe('Mô tả thay thế (Alt Text) tối ưu cho SEO'),
      caption: z.string().optional().describe('Chú thích hiển thị dưới ảnh'),
      description: z.string().optional().describe('Mô tả chi tiết ảnh'),
      post: z.number().int().positive().optional().describe('ID bài viết cần đính kèm tệp media'),
    },
    async ({ file_path, title, alt_text, caption, description, post }) => {
      try {
        const fileBuffer = await fs.readFile(file_path);
        const filename = path.basename(file_path);
        const mimeType = getMimeType(file_path);

        const uploadRes = await apiClient.uploadMedia<WpMedia>(fileBuffer, filename, mimeType, {
          post,
        });

        if ((uploadRes as unknown as { status?: string }).status === 'error') {
          return createCustomResponse(uploadRes);
        }

        const mediaId = (uploadRes as unknown as { data: WpMedia }).data.id;
        const updatePayload: Record<string, string | number> = {};
        if (title) updatePayload.title = title;
        if (alt_text) updatePayload.alt_text = alt_text;
        if (caption) updatePayload.caption = caption;
        if (description) updatePayload.description = description;

        if (Object.keys(updatePayload).length > 0) {
          const updated = await apiClient.post<WpMedia>(`media/${mediaId}`, updatePayload);
          return createFilteredResponse(updated, 'media');
        }

        return createFilteredResponse(uploadRes, 'media');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi đọc tệp cục bộ';
        return createCustomResponse({
          status: 'error',
          error_code: 'LOCAL_FILE_READ_ERROR',
          message: `Không thể đọc tệp ${file_path}: ${msg}`,
        });
      }
    }
  );

  // 4. Xóa tệp media
  server.tool(
    'wp_media_delete',
    'Xóa tệp media khỏi WordPress (yêu cầu force=true vì media không hỗ trợ chuyển vào thùng rác).',
    {
      id: z.number().int().positive().describe('ID tệp media cần xóa'),
      force: z.boolean().default(true).describe('Bắt buộc đặt true để xóa vĩnh viễn tệp media'),
    },
    async ({ id, force }) => {
      const res = await apiClient.delete<WpMedia>(`media/${id}`, { force });
      return createFilteredResponse(res, 'media');
    }
  );

  // 5. Cập nhật thông tin tệp media (alt_text, title, caption, description, post)
  server.tool(
    'wp_media_update',
    'Cập nhật thông tin tệp media theo ID (alt_text, title, caption, description, post) để bổ sung mô tả/SEO.',
    {
      id: z.number().int().positive().describe('ID tệp media cần cập nhật'),
      alt_text: z.string().optional().describe('Mô tả thay thế (Alt Text) tối ưu cho SEO/accessibility'),
      title: z.string().optional().describe('Tiêu đề tệp media'),
      caption: z.string().optional().describe('Chú thích hiển thị dưới ảnh'),
      description: z.string().optional().describe('Mô tả chi tiết tệp media'),
      post: z.number().int().positive().optional().describe('ID bài viết cần đính kèm tệp media'),
    },
    async ({ id, alt_text, title, caption, description, post }) => {
      const updatePayload: Record<string, string | number> = {};
      if (alt_text !== undefined) updatePayload.alt_text = alt_text;
      if (title !== undefined) updatePayload.title = title;
      if (caption !== undefined) updatePayload.caption = caption;
      if (description !== undefined) updatePayload.description = description;
      if (post !== undefined) updatePayload.post = post;

      if (Object.keys(updatePayload).length === 0) {
        return createCustomResponse({
          status: 'error',
          error_code: 'MISSING_UPDATE_FIELDS',
          message: 'Cần cung cấp ít nhất một trường cần cập nhật (alt_text, title, caption, description hoặc post).',
        });
      }

      const res = await apiClient.post<WpMedia>(`media/${id}`, updatePayload);
      return createFilteredResponse(res, 'media');
    }
  );

  // 6. Liệt kê các tệp media thiếu alt_text (mô tả thay thế)
  server.tool(
    'wp_media_list_missing_alt',
    'Liệt kê các tệp media (mặc định ảnh) thiếu alt_text/mô tả thay thế, để kiểm tra và bổ sung SEO/accessibility.',
    {
      media_type: z.enum(['image', 'video', 'audio', 'application']).optional().default('image').describe('Loại tệp media cần kiểm tra (mặc định image)'),
      mime_type: z.string().optional().describe('MIME type cụ thể (ví dụ: image/webp)'),
      per_page: z.number().int().positive().max(100).optional().default(100).describe('Số lượng tệp trên mỗi trang (mặc định 100, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
    },
    async ({ media_type, mime_type, per_page, page }) => {
      const res = await apiClient.get<WpMedia[]>('media', {
        media_type,
        mime_type,
        per_page,
        page,
      });

      if ((res as unknown as { status?: string }).status === 'error') {
        return createCustomResponse(res);
      }

      const obj = res as unknown as { data: WpMedia[]; total?: number; totalPages?: number };
      const scanned = obj.data || [];
      const missing = scanned.filter((m) => !m.alt_text || m.alt_text.trim() === '');

      const payload = {
        status: 'success',
        media_type,
        page: page || 1,
        per_page,
        total: obj.total,
        total_pages: obj.totalPages,
        scanned_count: scanned.length,
        missing_alt_count: missing.length,
        items: missing.map((m) => ({
          id: m.id,
          title: m.title?.rendered,
          source_url: m.source_url,
          alt_text: m.alt_text,
          suggested_alt: m.title?.rendered || '',
        })),
      };

      return createCustomResponse(payload);
    }
  );
}