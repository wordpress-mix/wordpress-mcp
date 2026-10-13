/**
 * Bộ công cụ quản lý Bình luận (Comments) cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpComment } from '../types.js';

export function registerCommentTools(server: McpServer): void {
  // 1. Danh sách bình luận
  server.tool(
    'wp_comment_list',
    'Lấy danh sách bình luận trên WordPress (hỗ trợ lọc theo bài viết, trạng thái duyệt).',
    {
      post: z.number().int().positive().optional().describe('ID bài viết cần lấy bình luận'),
      status: z.enum(['all', 'approved', 'hold', 'spam', 'trash']).optional().describe('Trạng thái duyệt bình luận'),
      search: z.string().max(100).optional().describe('Từ khóa tìm kiếm nội dung bình luận'),
      per_page: z.number().int().positive().max(100).optional().describe('Số lượng bình luận trên mỗi trang (mặc định 10, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
    },
    async (params) => {
      const res = await apiClient.get<WpComment[]>('comments', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 2. Chi tiết bình luận
  server.tool(
    'wp_comment_get',
    'Lấy thông tin chi tiết một bình luận theo ID.',
    {
      id: z.number().int().positive().describe('ID của bình luận'),
    },
    async ({ id }) => {
      const res = await apiClient.get<WpComment>(`comments/${id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 3. Tạo bình luận mới
  server.tool(
    'wp_comment_create',
    'Tạo một bình luận mới cho bài viết trong WordPress.',
    {
      post: z.number().int().positive().describe('ID bài viết được bình luận'),
      content: z.string().min(1).describe('Nội dung bình luận'),
      author_name: z.string().optional().describe('Tên người bình luận'),
      author_email: z.string().email().optional().describe('Email người bình luận'),
      parent: z.number().int().optional().describe('ID bình luận cha nếu là câu trả lời'),
    },
    async (payload) => {
      const res = await apiClient.post<WpComment>('comments', payload);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 4. Cập nhật bình luận
  server.tool(
    'wp_comment_update',
    'Cập nhật nội dung hoặc trạng thái duyệt của bình luận (approved/hold/spam/trash).',
    {
      id: z.number().int().positive().describe('ID bình luận cần cập nhật'),
      content: z.string().optional().describe('Nội dung bình luận mới'),
      status: z.enum(['approved', 'hold', 'spam', 'trash']).optional().describe('Trạng thái duyệt mới'),
    },
    async ({ id, ...payload }) => {
      const res = await apiClient.post<WpComment>(`comments/${id}`, payload);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 5. Xóa bình luận
  server.tool(
    'wp_comment_delete',
    'Xóa bình luận theo ID (mặc định chuyển vào thùng rác trash; đặt force=true để xóa vĩnh viễn).',
    {
      id: z.number().int().positive().describe('ID của bình luận cần xóa'),
      force: z.boolean().optional().describe('Xóa vĩnh viễn (mặc định false)'),
    },
    async ({ id, force }) => {
      const res = await apiClient.delete<WpComment>(`comments/${id}`, { force });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );
}
