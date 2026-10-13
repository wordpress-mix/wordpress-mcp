/**
 * Bộ công cụ quản lý Media cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpMedia } from '../types.js';

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
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
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
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
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

        if (uploadRes.status === 'error') {
          return {
            content: [{ type: 'text', text: JSON.stringify(uploadRes, null, 2) }],
          };
        }

        const mediaId = uploadRes.data.id;
        const updatePayload: Record<string, string | number> = {};
        if (title) updatePayload.title = title;
        if (alt_text) updatePayload.alt_text = alt_text;
        if (caption) updatePayload.caption = caption;
        if (description) updatePayload.description = description;

        if (Object.keys(updatePayload).length > 0) {
          const updated = await apiClient.post<WpMedia>(`media/${mediaId}`, updatePayload);
          return {
            content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(uploadRes, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi đọc tệp cục bộ';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'error',
                  error_code: 'LOCAL_FILE_READ_ERROR',
                  message: `Không thể đọc tệp ${file_path}: ${msg}`,
                },
                null,
                2
              ),
            },
          ],
        };
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
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );
}
