/**
 * Bộ công cụ quản lý Phân loại (Categories & Tags) cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpCategory, WpTag } from '../types.js';

export function registerTaxonomyTools(server: McpServer): void {
  // 1. Danh sách chuyên mục (Categories)
  server.tool(
    'wp_category_list',
    'Lấy danh sách các chuyên mục (Categories) trong WordPress.',
    {
      search: z.string().max(100).optional().describe('Từ khóa tìm kiếm chuyên mục'),
      parent: z.number().int().optional().describe('ID chuyên mục cha để lọc'),
      per_page: z.number().int().positive().max(100).optional().describe('Số lượng chuyên mục trên mỗi trang (mặc định 10, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
    },
    async (params) => {
      const res = await apiClient.get<WpCategory[]>('categories', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 2. Chi tiết chuyên mục
  server.tool(
    'wp_category_get',
    'Lấy thông tin chi tiết một chuyên mục theo ID.',
    {
      id: z.number().int().positive().describe('ID của chuyên mục'),
    },
    async ({ id }) => {
      const res = await apiClient.get<WpCategory>(`categories/${id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 3. Tạo chuyên mục mới
  server.tool(
    'wp_category_create',
    'Tạo một chuyên mục mới trong WordPress.',
    {
      name: z.string().min(1).describe('Tên chuyên mục'),
      slug: z.string().optional().describe('Đường dẫn tĩnh (slug) của chuyên mục'),
      description: z.string().optional().describe('Mô tả chuyên mục'),
      parent: z.number().int().optional().describe('ID chuyên mục cha'),
    },
    async (payload) => {
      const res = await apiClient.post<WpCategory>('categories', payload);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 4. Cập nhật chuyên mục
  server.tool(
    'wp_category_update',
    'Cập nhật tên, mô tả hoặc slug của một chuyên mục theo ID.',
    {
      id: z.number().int().positive().describe('ID chuyên mục cần cập nhật'),
      name: z.string().optional().describe('Tên mới'),
      slug: z.string().optional().describe('Slug mới'),
      description: z.string().optional().describe('Mô tả mới'),
      parent: z.number().int().optional().describe('ID chuyên mục cha mới'),
    },
    async ({ id, ...payload }) => {
      const res = await apiClient.post<WpCategory>(`categories/${id}`, payload);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 5. Xóa chuyên mục
  server.tool(
    'wp_category_delete',
    'Xóa chuyên mục theo ID khỏi WordPress.',
    {
      id: z.number().int().positive().describe('ID chuyên mục cần xóa'),
      force: z.boolean().default(true).describe('Bắt buộc đặt true để xóa'),
    },
    async ({ id, force }) => {
      const res = await apiClient.delete<WpCategory>(`categories/${id}`, { force });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 6. Danh sách thẻ (Tags)
  server.tool(
    'wp_tag_list',
    'Lấy danh sách các thẻ bài viết (Tags) trong WordPress.',
    {
      search: z.string().max(100).optional().describe('Từ khóa tìm kiếm thẻ tag'),
      per_page: z.number().int().positive().max(100).optional().describe('Số lượng thẻ trên mỗi trang (mặc định 10, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
    },
    async (params) => {
      const res = await apiClient.get<WpTag[]>('tags', params);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 7. Chi tiết thẻ
  server.tool(
    'wp_tag_get',
    'Lấy thông tin chi tiết một thẻ bài viết theo ID.',
    {
      id: z.number().int().positive().describe('ID của thẻ tag'),
    },
    async ({ id }) => {
      const res = await apiClient.get<WpTag>(`tags/${id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 8. Tạo thẻ mới
  server.tool(
    'wp_tag_create',
    'Tạo một thẻ bài viết (Tag) mới trong WordPress.',
    {
      name: z.string().min(1).describe('Tên thẻ tag'),
      slug: z.string().optional().describe('Đường dẫn tĩnh (slug) của thẻ tag'),
      description: z.string().optional().describe('Mô tả thẻ tag'),
    },
    async (payload) => {
      const res = await apiClient.post<WpTag>('tags', payload);
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );

  // 9. Xóa thẻ
  server.tool(
    'wp_tag_delete',
    'Xóa thẻ bài viết (Tag) theo ID khỏi WordPress.',
    {
      id: z.number().int().positive().describe('ID của thẻ tag cần xóa'),
      force: z.boolean().default(true).describe('Bắt buộc đặt true để xóa thẻ tag'),
    },
    async ({ id, force }) => {
      const res = await apiClient.delete<WpTag>(`tags/${id}`, { force });
      return {
        content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
      };
    }
  );
}
