/**
 * Bộ công cụ quản lý Bài viết (Posts) cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { WpPost } from '../types.js';
import { createFilteredResponse, createCustomResponse } from '../lib/response-filter.js';

/**
 * Cấu trúc một entry trong meta `_vnhte_image_prompts`:
 * { id: string, prompt: string, alt: string, order?: number }
 */
const ImagePromptSchema = z.object({
  id: z.string().min(1).describe('ID định danh của prompt (chuỗi, ví dụ "1234")'),
  prompt: z.string().min(1).describe('Prompt tạo ảnh (ví dụ: "Cinematic shot of Linux server room, neon cyan lights, photorealistic 8k")'),
  alt: z.string().optional().describe('Mô tả thay thế (Alt Text) tương ứng với ảnh tạo ra'),
  order: z.number().int().optional().describe('Thứ tự sắp xếp (số nguyên, tùy chọn; dùng để sort hiển thị)'),
});

export function registerPostTools(server: McpServer): void {
  // 1. Danh sách bài viết
  server.tool(
    'wp_post_list',
    'Tìm kiếm, lọc theo trạng thái/chuyên mục/tag và phân trang danh sách bài viết WordPress.',
    {
      search: z.string().max(100).optional().describe('Từ khóa tìm kiếm trong tiêu đề hoặc nội dung bài viết'),
      status: z.enum(['publish', 'future', 'draft', 'pending', 'private', 'trash']).optional().describe('Trạng thái bài viết'),
      categories: z.array(z.number().int().positive()).optional().describe('Danh sách ID chuyên mục cần lọc'),
      tags: z.array(z.number().int().positive()).optional().describe('Danh sách ID thẻ tag cần lọc'),
      author: z.number().int().positive().optional().describe('ID tác giả bài viết'),
      per_page: z.number().int().positive().max(100).optional().describe('Số lượng bài viết trên mỗi trang (mặc định 10, tối đa 100)'),
      page: z.number().int().positive().optional().describe('Số trang cần lấy'),
      order: z.enum(['asc', 'desc']).optional().describe('Thứ tự sắp xếp (mặc định desc)'),
      orderby: z.enum(['date', 'id', 'title', 'slug', 'modified']).optional().describe('Trường dùng để sắp xếp (mặc định date)'),
      fields: z.array(z.string()).optional().describe('Danh sách các trường cần lấy, hỗ trợ đường dẫn lồng nhau và chế độ render (ví dụ: ["id", "title.rendered", "content.rendered:full", "author"]). Thêm suffix ":minimal" hoặc ":full" để chọn chế độ render cho từng trường (mặc định theo render_mode). Nếu truyền, chỉ trả về các trường này (giống GraphQL). Bỏ trống để trả về mặc định.'),
      render_mode: z.enum(['minimal', 'full']).optional().describe('Chế độ render mặc định cho các trường: minimal (ẩn raw/protected và các trường hệ thống) hoặc full (giữ nguyên raw/protected). Mặc định minimal.'),
    },
    async (params) => {
      const queryParams: Record<string, string | number | boolean | undefined> = {
        search: params.search,
        status: params.status,
        author: params.author,
        per_page: params.per_page,
        page: params.page,
        order: params.order,
        orderby: params.orderby,
      };

      if (params.categories && params.categories.length > 0) {
        queryParams.categories = params.categories.join(',');
      }
      if (params.tags && params.tags.length > 0) {
        queryParams.tags = params.tags.join(',');
      }

      const res = await apiClient.get<WpPost[]>('posts', queryParams);
      return createFilteredResponse(res, 'post', params.render_mode || 'minimal', params.fields);
    }
  );

  // 2. Chi tiết bài viết
  server.tool(
    'wp_post_get',
    'Lấy thông tin chi tiết một bài viết theo ID (dùng context=edit để lấy raw Gutenberg HTML blocks).',
    {
      id: z.number().int().positive().describe('ID của bài viết'),
      context: z.enum(['view', 'edit']).optional().describe('Ngữ cảnh lấy dữ liệu (edit để lấy raw Gutenberg blocks, view để lấy HTML đã render)'),
      fields: z.array(z.string()).optional().describe('Danh sách các trường cần lấy, hỗ trợ đường dẫn lồng nhau và chế độ render (ví dụ: ["id", "title.rendered", "content.rendered:full", "author"]). Thêm suffix ":minimal" hoặc ":full" để chọn chế độ render cho từng trường (mặc định theo render_mode). Nếu truyền, chỉ trả về các trường này (giống GraphQL). Bỏ trống để trả về mặc định.'),
      render_mode: z.enum(['minimal', 'full']).optional().describe('Chế độ render mặc định cho các trường: minimal (ẩn raw/protected và các trường hệ thống) hoặc full (giữ nguyên raw/protected). Mặc định minimal.'),
    },
    async ({ id, context, fields, render_mode }) => {
      const res = await apiClient.get<WpPost>(`posts/${id}`, { context });
      return createFilteredResponse(res, 'post', render_mode || 'minimal', fields);
    }
  );

  // 3. Tạo bài viết mới
  server.tool(
    'wp_post_create',
    'Tạo bài viết mới trong WordPress (mặc định trạng thái draft; hỗ trợ nội dung Gutenberg HTML blocks).',
    {
      title: z.string().min(1).describe('Tiêu đề bài viết'),
      content: z.string().describe('Nội dung bài viết (khuyên dùng định dạng Gutenberg HTML blocks)'),
      status: z.enum(['draft', 'publish', 'pending', 'private']).optional().describe('Trạng thái bài viết (mặc định draft)'),
      excerpt: z.string().optional().describe('Đoạn trích tóm tắt bài viết'),
      categories: z.array(z.number().int().positive()).optional().describe('Danh sách ID chuyên mục'),
      tags: z.array(z.number().int().positive()).optional().describe('Danh sách ID thẻ tag'),
      featured_media: z.number().int().positive().optional().describe('ID tệp media làm ảnh đại diện'),
      slug: z.string().optional().describe('Đường dẫn tĩnh (slug) của bài viết'),
    },
    async (params) => {
      const payload = {
        title: params.title,
        content: params.content,
        status: params.status || 'draft',
        excerpt: params.excerpt,
        categories: params.categories,
        tags: params.tags,
        featured_media: params.featured_media,
        slug: params.slug,
      };

      const res = await apiClient.post<WpPost>('posts', payload);
      return createFilteredResponse(res, 'post');
    }
  );

  // 4. Cập nhật bài viết
  server.tool(
    'wp_post_update',
    'Cập nhật thông tin bài viết theo ID (tiêu đề, nội dung, chuyên mục, trạng thái, v.v.).',
    {
      id: z.number().int().positive().describe('ID của bài viết cần cập nhật'),
      title: z.string().optional().describe('Tiêu đề mới'),
      content: z.string().optional().describe('Nội dung mới dạng Gutenberg blocks'),
      status: z.enum(['draft', 'publish', 'pending', 'private', 'trash']).optional().describe('Trạng thái mới'),
      excerpt: z.string().optional().describe('Đoạn trích mới'),
      categories: z.array(z.number().int().positive()).optional().describe('Danh sách ID chuyên mục mới'),
      tags: z.array(z.number().int().positive()).optional().describe('Danh sách ID thẻ tag mới'),
      featured_media: z.number().int().positive().optional().describe('ID ảnh đại diện mới'),
      slug: z.string().optional().describe('Slug mới'),
    },
    async ({ id, ...payload }) => {
      const res = await apiClient.post<WpPost>(`posts/${id}`, payload);
      return createFilteredResponse(res, 'post');
    }
  );

  // 5. Xóa bài viết
  server.tool(
    'wp_post_delete',
    'Xóa bài viết theo ID (mặc định chuyển vào thùng rác trash; đặt force=true để xóa vĩnh viễn).',
    {
      id: z.number().int().positive().describe('ID của bài viết cần xóa'),
      force: z.boolean().optional().describe('Xóa vĩnh viễn không đưa vào thùng rác (mặc định false)'),
    },
    async ({ id, force }) => {
      const res = await apiClient.delete<WpPost>(`posts/${id}`, { force });
      return createFilteredResponse(res, 'post');
    }
  );

  // 6. Lấy danh sách image prompts của bài viết (meta _vnhte_image_prompts)
  server.tool(
    'wp_post_meta_get_image_prompts',
    'Lấy danh sách image prompts từ meta `_vnhte_image_prompts` của bài viết (mảng object: id, prompt, alt). Đây là metabox custom meta (không phải trường nội dung bài viết).',
    {
      id: z.number().int().positive().describe('ID của bài viết'),
    },
    async ({ id }) => {
      const res = await apiClient.get<WpPost>(`posts/${id}`, { context: 'edit' });
      const obj = res as unknown as { status?: string; data?: WpPost };
      if (obj.status === 'error') {
        return createCustomResponse(res);
      }
      const prompts = ((obj.data?.meta?._vnhte_image_prompts as unknown as Array<{ id: string; prompt: string; alt?: string; order?: number }>) || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      return createCustomResponse({ status: 'success', post_id: id, count: prompts.length, prompts });
    }
  );

  // 7. Cập nhật (thêm/sửa/xóa) image prompts của bài viết
  server.tool(
    'wp_post_meta_update_image_prompts',
    'Cập nhật meta `_vnhte_image_prompts` (metabox custom meta) của bài viết - ghi đè toàn bộ mảng. Truyền mảng rỗng [] để xóa hết.',
    {
      id: z.number().int().positive().describe('ID của bài viết cần cập nhật'),
      prompts: z.array(ImagePromptSchema).describe('Danh sách image prompts mới (mỗi item: id, prompt, alt?)'),
    },
    async ({ id, prompts }) => {
      const res = await apiClient.post<WpPost>(`posts/${id}`, {
        meta: { _vnhte_image_prompts: prompts },
      });
      return createFilteredResponse(res, 'post');
    }
  );

  // 8. Thêm một image prompt vào bài viết (append, không ghi đè)
  server.tool(
    'wp_post_meta_add_image_prompt',
    'Thêm một image prompt vào meta `_vnhte_image_prompts` (metabox custom meta) của bài viết - append vào mảng hiện tại.',
    {
      id: z.number().int().positive().describe('ID của bài viết'),
      prompt_id: z.string().min(1).describe('ID định danh của prompt mới (chuỗi, ví dụ "1234")'),
      prompt: z.string().min(1).describe('Prompt tạo ảnh (ví dụ: "Cinematic shot of Linux server room, neon cyan lights, photorealistic 8k")'),
      alt: z.string().optional().describe('Mô tả thay thế (Alt Text) tương ứng với ảnh tạo ra'),
      order: z.number().int().optional().describe('Thứ tự sắp xếp (số nguyên, tùy chọn)'),
    },
    async ({ id, prompt_id, prompt, alt, order }) => {
      const getRes = await apiClient.get<WpPost>(`posts/${id}`, { context: 'edit' });
      const getObj = getRes as unknown as { status?: string; data?: WpPost };
      if (getObj.status === 'error') {
        return createCustomResponse(getRes);
      }
      const current = (getObj.data?.meta?._vnhte_image_prompts as unknown as Array<{ id: string; prompt: string; alt?: string; order?: number }>) || [];
      const exists = current.some((p) => p.id === prompt_id);
      if (exists) {
        return createCustomResponse({
          status: 'error',
          error_code: 'DUPLICATE_PROMPT_ID',
          message: `Prompt với id "${prompt_id}" đã tồn tại trong bài viết #${id}.`,
        });
      }
      const newItem: { id: string; prompt: string; alt: string; order?: number } = {
        id: prompt_id,
        prompt,
        alt: alt || '',
      };
      if (order !== undefined) newItem.order = order;
      const updated = [...current, newItem];
      const res = await apiClient.post<WpPost>(`posts/${id}`, {
        meta: { _vnhte_image_prompts: updated },
      });
      return createFilteredResponse(res, 'post');
    }
  );
}