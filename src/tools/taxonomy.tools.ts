/**
 * Bộ công cụ quản lý Phân loại (Categories & Tags) cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpCategory, WpTag } from '../types.js';
import { createFilteredResponse } from '../lib/response-filter.js';

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
      fields: z.array(z.string()).optional().describe('Danh sách các trường cần lấy, hỗ trợ đường dẫn lồng nhau và chế độ render (ví dụ: ["id", "name", "slug", "count"]). Thêm suffix ":minimal" hoặc ":full" để chọn chế độ render cho từng trường (mặc định theo render_mode). Nếu truyền, chỉ trả về các trường này (giống GraphQL). Bỏ trống để trả về mặc định.'),
      render_mode: z.enum(['minimal', 'full']).optional().describe('Chế độ render mặc định cho các trường: minimal (ẩn raw/protected và các trường hệ thống) hoặc full (giữ nguyên raw/protected). Mặc định minimal.'),
    },
    async (params) => {
      const queryParams: Record<string, string | number | boolean | undefined> = {
        search: params.search,
        parent: params.parent,
        per_page: params.per_page,
        page: params.page,
      };
      const res = await apiClient.get<WpCategory[]>('categories', queryParams);
      return createFilteredResponse(res, 'category', params.render_mode || 'minimal', params.fields);
    }
  );

  // 2. Chi tiết chuyên mục
  server.tool(
    'wp_category_get',
    'Lấy thông tin chi tiết một chuyên mục theo ID.',
    {
      id: z.number().int().positive().describe('ID của chuyên mục'),
      fields: z.array(z.string()).optional().describe('Danh sách các trường cần lấy, hỗ trợ đường dẫn lồng nhau và chế độ render (ví dụ: ["id", "name", "slug", "count"]). Thêm suffix ":minimal" hoặc ":full" để chọn chế độ render cho từng trường (mặc định theo render_mode). Nếu truyền, chỉ trả về các trường này (giống GraphQL). Bỏ trống để trả về mặc định.'),
      render_mode: z.enum(['minimal', 'full']).optional().describe('Chế độ render mặc định cho các trường: minimal (ẩn raw/protected và các trường hệ thống) hoặc full (giữ nguyên raw/protected). Mặc định minimal.'),
    },
    async ({ id, fields, render_mode }) => {
      const res = await apiClient.get<WpCategory>(`categories/${id}`);
      return createFilteredResponse(res, 'category', render_mode || 'minimal', fields);
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
      fields: z.array(z.string()).optional().describe('Danh sách các trường cần lấy, hỗ trợ đường dẫn lồng nhau và chế độ render (ví dụ: ["id", "name", "slug", "count"]). Thêm suffix ":minimal" hoặc ":full" để chọn chế độ render cho từng trường (mặc định theo render_mode). Nếu truyền, chỉ trả về các trường này (giống GraphQL). Bỏ trống để trả về mặc định.'),
      render_mode: z.enum(['minimal', 'full']).optional().describe('Chế độ render mặc định cho các trường: minimal (ẩn raw/protected và các trường hệ thống) hoặc full (giữ nguyên raw/protected). Mặc định minimal.'),
    },
    async (params) => {
      const queryParams: Record<string, string | number | boolean | undefined> = {
        search: params.search,
        per_page: params.per_page,
        page: params.page,
      };
      const res = await apiClient.get<WpTag[]>('tags', queryParams);
      return createFilteredResponse(res, 'tag', params.render_mode || 'minimal', params.fields);
    }
  );

  // 7. Chi tiết thẻ
  server.tool(
    'wp_tag_get',
    'Lấy thông tin chi tiết một thẻ bài viết theo ID.',
    {
      id: z.number().int().positive().describe('ID của thẻ tag'),
      fields: z.array(z.string()).optional().describe('Danh sách các trường cần lấy, hỗ trợ đường dẫn lồng nhau và chế độ render (ví dụ: ["id", "name", "slug", "count"]). Thêm suffix ":minimal" hoặc ":full" để chọn chế độ render cho từng trường (mặc định theo render_mode). Nếu truyền, chỉ trả về các trường này (giống GraphQL). Bỏ trống để trả về mặc định.'),
      render_mode: z.enum(['minimal', 'full']).optional().describe('Chế độ render mặc định cho các trường: minimal (ẩn raw/protected và các trường hệ thống) hoặc full (giữ nguyên raw/protected). Mặc định minimal.'),
    },
    async ({ id, fields, render_mode }) => {
      const res = await apiClient.get<WpTag>(`tags/${id}`);
      return createFilteredResponse(res, 'tag', render_mode || 'minimal', fields);
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
      return createFilteredResponse(res, 'tag');
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
      return createFilteredResponse(res, 'tag');
    }
  );
}