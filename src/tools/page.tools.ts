/**
 * Bộ công cụ quản lý Trang tĩnh (Pages) cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpPage } from '../types.js';
import { createFilteredResponse } from '../lib/response-filter.js';

export function registerPageTools(server: McpServer): void {
  // 1. Danh sách trang
  server.tool(
    'wp_page_list',
    'Tìm kiếm, lọc theo trạng thái và phân trang danh sách trang tĩnh (Pages) trong WordPress.',
    {
      search: z.string().max(100).optional().describe('Từ khóa tìm kiếm trong tiêu đề hoặc nội dung trang'),
      status: z.enum(['publish', 'future', 'draft', 'pending', 'private', 'trash']).optional().describe('Trạng thái trang tĩnh'),
      parent: z.number().int().optional().describe('ID trang cha để lọc trang con'),
      per_page: z.number().int().positive().max(100).optional().describe('Số lượng trang trên mỗi trang kết quả (mặc định 10, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
    },
    async (params) => {
      const res = await apiClient.get<WpPage[]>('pages', params);
      return createFilteredResponse(res, 'page');
    }
  );

  // 2. Chi tiết trang
  server.tool(
    'wp_page_get',
    'Lấy thông tin chi tiết một trang tĩnh theo ID (dùng context=edit để lấy raw Gutenberg HTML blocks).',
    {
      id: z.number().int().positive().describe('ID của trang tĩnh'),
      context: z.enum(['view', 'edit']).optional().describe('Ngữ cảnh lấy dữ liệu (edit để lấy raw Gutenberg blocks)'),
    },
    async ({ id, context }) => {
      const res = await apiClient.get<WpPage>(`pages/${id}`, { context });
      return createFilteredResponse(res, 'page');
    }
  );

  // 3. Tạo trang tĩnh mới
  server.tool(
    'wp_page_create',
    'Tạo một trang tĩnh mới trong WordPress.',
    {
      title: z.string().min(1).describe('Tiêu đề trang'),
      content: z.string().describe('Nội dung trang (định dạng Gutenberg HTML blocks)'),
      status: z.enum(['draft', 'publish', 'pending', 'private']).optional().describe('Trạng thái trang (mặc định draft)'),
      slug: z.string().optional().describe('Đường dẫn tĩnh (slug) của trang'),
      parent: z.number().int().optional().describe('ID trang cha nếu là trang con'),
      menu_order: z.number().int().optional().describe('Thứ tự sắp xếp trong menu'),
    },
    async (params) => {
      const payload = {
        title: params.title,
        content: params.content,
        status: params.status || 'draft',
        slug: params.slug,
        parent: params.parent,
        menu_order: params.menu_order,
      };

      const res = await apiClient.post<WpPage>('pages', payload);
      return createFilteredResponse(res, 'page');
    }
  );

  // 4. Cập nhật trang tĩnh
  server.tool(
    'wp_page_update',
    'Cập nhật nội dung hoặc thuộc tính của một trang tĩnh theo ID.',
    {
      id: z.number().int().positive().describe('ID của trang cần cập nhật'),
      title: z.string().optional().describe('Tiêu đề mới'),
      content: z.string().optional().describe('Nội dung mới dạng Gutenberg blocks'),
      status: z.enum(['draft', 'publish', 'pending', 'private', 'trash']).optional().describe('Trạng thái mới'),
      slug: z.string().optional().describe('Slug mới'),
      parent: z.number().int().optional().describe('ID trang cha mới'),
      menu_order: z.number().int().optional().describe('Thứ tự menu mới'),
    },
    async ({ id, ...payload }) => {
      const res = await apiClient.post<WpPage>(`pages/${id}`, payload);
      return createFilteredResponse(res, 'page');
    }
  );

  // 5. Xóa trang tĩnh
  server.tool(
    'wp_page_delete',
    'Xóa trang tĩnh theo ID (mặc định chuyển vào thùng rác trash; đặt force=true để xóa vĩnh viễn).',
    {
      id: z.number().int().positive().describe('ID của trang cần xóa'),
      force: z.boolean().optional().describe('Xóa vĩnh viễn không đưa vào thùng rác (mặc định false)'),
    },
    async ({ id, force }) => {
      const res = await apiClient.delete<WpPage>(`pages/${id}`, { force });
      return createFilteredResponse(res, 'page');
    }
  );
}