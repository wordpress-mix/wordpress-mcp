/**
 * Bộ công cụ quản lý RankMath SEO cho WordPress MCP Server
 * Hỗ trợ cập nhật tiêu đề SEO, mô tả SEO và từ khóa (1 chính, tối đa 4 phụ)
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import type { ApiResponse, RankMathSeoData, WpPost } from '../types.js';
import { createFilteredResponse, createCustomResponse } from '../lib/response-filter.js';

function parseFocusKeywords(raw: string = ''): { primaryKeyword: string; secondaryKeywords: string[] } {
  const parts = raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const primaryKeyword = parts[0] || '';
  const secondaryKeywords = parts.slice(1, 5);
  return { primaryKeyword, secondaryKeywords };
}

function buildFocusKeywordString(primaryKeyword: string, secondaryKeywords: string[] = []): string {
  const all = [primaryKeyword.trim(), ...secondaryKeywords.map((k) => k.trim()).filter(Boolean)].slice(0, 5);
  return all.join(', ');
}

export function registerRankMathTools(server: McpServer): void {
  // 1. Lấy thông tin SEO RankMath của bài viết/trang
  server.tool(
    'wp_rankmath_get_seo',
    'Lấy chi tiết dữ liệu SEO RankMath của bài viết hoặc trang tĩnh (tiêu đề SEO, mô tả SEO, từ khóa 1 chính và 4 phụ).',
    {
      post_id: z.number().int().positive().describe('ID của bài viết hoặc trang'),
      post_type: z.enum(['post', 'page']).default('post').describe('Loại nội dung (post hoặc page, mặc định post)'),
    },
    async ({ post_id, post_type }) => {
      const endpoint = post_type === 'page' ? `pages/${post_id}` : `posts/${post_id}`;
      const res = await apiClient.get<WpPost>(endpoint, { context: 'edit' });

      const obj = res as unknown as ApiResponse<WpPost>;
      if (obj.status === 'error') {
        return createCustomResponse(res);
      }

      const meta = (obj.data?.meta || {}) as Record<string, unknown>;
      const rawKeyword = typeof meta.rank_math_focus_keyword === 'string' ? meta.rank_math_focus_keyword : '';
      const { primaryKeyword, secondaryKeywords } = parseFocusKeywords(rawKeyword);

      const seoData: RankMathSeoData = {
        postId: post_id,
        postType: post_type,
        title: typeof meta.rank_math_title === 'string' ? meta.rank_math_title : undefined,
        description: typeof meta.rank_math_description === 'string' ? meta.rank_math_description : undefined,
        primaryKeyword,
        secondaryKeywords,
        focusKeywordsRaw: rawKeyword,
        canonicalUrl: typeof meta.rank_math_canonical_url === 'string' ? meta.rank_math_canonical_url : undefined,
        robots: Array.isArray(meta.rank_math_robots) ? (meta.rank_math_robots as string[]) : undefined,
        metaRaw: meta,
      };

      return createCustomResponse({
        status: 'success',
        data: seoData,
      });
    }
  );

  // 2. Cập nhật tổng thể SEO RankMath
  server.tool(
    'wp_rankmath_update_seo',
    'Cập nhật toàn diện siêu dữ liệu SEO RankMath (tiêu đề, mô tả, từ khóa 1 chính và tối đa 4 từ khóa phụ).',
    {
      post_id: z.number().int().positive().describe('ID bài viết hoặc trang cần cập nhật'),
      post_type: z.enum(['post', 'page']).default('post').describe('Loại nội dung (post hoặc page, mặc định post)'),
      title: z.string().optional().describe('Tiêu đề SEO RankMath (tối ưu từ 50-60 ký tự, chứa Focus Keyword)'),
      description: z.string().optional().describe('Mô tả SEO Meta Description (tối ưu từ 120-160 ký tự, chứa CTA)'),
      primary_keyword: z.string().optional().describe('Từ khóa chính (Focus Keyword)'),
      secondary_keywords: z.array(z.string()).max(4).optional().describe('Danh sách tối đa 4 từ khóa phụ (LSI keywords)'),
      canonical_url: z.string().url().optional().describe('Đường dẫn Canonical URL tùy chỉnh'),
    },
    async ({ post_id, post_type, title, description, primary_keyword, secondary_keywords, canonical_url }) => {
      const metaToUpdate: Record<string, unknown> = {};

      if (title !== undefined) {
        metaToUpdate.rank_math_title = title;
      }
      if (description !== undefined) {
        metaToUpdate.rank_math_description = description;
      }
      if (canonical_url !== undefined) {
        metaToUpdate.rank_math_canonical_url = canonical_url;
      }

      if (primary_keyword !== undefined) {
        metaToUpdate.rank_math_focus_keyword = buildFocusKeywordString(primary_keyword, secondary_keywords || []);
      } else if (secondary_keywords !== undefined && secondary_keywords.length > 0) {
        // Nếu chỉ truyền từ khóa phụ, đọc từ khóa chính hiện tại để gộp lại
        const endpointGet = post_type === 'page' ? `pages/${post_id}` : `posts/${post_id}`;
        const currentRes = await apiClient.get<WpPost>(endpointGet, { context: 'edit' });
        const currentObj = currentRes as unknown as ApiResponse<WpPost>;
        if (currentObj.status === 'success') {
          const currentMeta = (currentObj.data?.meta || {}) as Record<string, unknown>;
          const currentKeyword = typeof currentMeta.rank_math_focus_keyword === 'string' ? currentMeta.rank_math_focus_keyword : '';
          const { primaryKeyword: curPrimary } = parseFocusKeywords(currentKeyword);
          metaToUpdate.rank_math_focus_keyword = buildFocusKeywordString(curPrimary || secondary_keywords[0], secondary_keywords);
        }
      }

      const endpoint = post_type === 'page' ? `pages/${post_id}` : `posts/${post_id}`;
      const res = await apiClient.post<WpPost>(endpoint, { meta: metaToUpdate });

      // Cập nhật bổ trợ qua RankMath custom REST API nếu có
      apiClient
        .post('rankmath/v1/updateMeta', {
          objectID: post_id,
          objectType: post_type,
          meta: metaToUpdate,
        })
        .catch(() => null);

      const resObj = res as unknown as ApiResponse<WpPost>;
      if (resObj.status === 'error') {
        return createCustomResponse(res);
      }

      const updatedMeta = (resObj.data?.meta || {}) as Record<string, unknown>;
      const rawKeyword = typeof updatedMeta.rank_math_focus_keyword === 'string'
        ? updatedMeta.rank_math_focus_keyword
        : (metaToUpdate.rank_math_focus_keyword as string) || '';
      const { primaryKeyword, secondaryKeywords: secKw } = parseFocusKeywords(rawKeyword);

      return createCustomResponse({
        status: 'success',
        message: `Đã cập nhật thành công siêu dữ liệu SEO RankMath cho ${post_type} #${post_id}`,
        data: {
          postId: post_id,
          postType: post_type,
          title: updatedMeta.rank_math_title || metaToUpdate.rank_math_title,
          description: updatedMeta.rank_math_description || metaToUpdate.rank_math_description,
          primaryKeyword,
          secondaryKeywords: secKw,
          focusKeywordsRaw: rawKeyword,
        },
      });
    }
  );

  // 3. Cập nhật riêng tiêu đề SEO RankMath
  server.tool(
    'wp_rankmath_set_title',
    'Cập nhật riêng tiêu đề SEO RankMath (rank_math_title) cho bài viết hoặc trang.',
    {
      post_id: z.number().int().positive().describe('ID của bài viết hoặc trang'),
      post_type: z.enum(['post', 'page']).default('post').describe('Loại nội dung (post hoặc page, mặc định post)'),
      title: z.string().min(1).max(120).describe('Tiêu đề SEO mới (khuyến nghị 50-60 ký tự, có chứa Focus Keyword)'),
    },
    async ({ post_id, post_type, title }) => {
      const endpoint = post_type === 'page' ? `pages/${post_id}` : `posts/${post_id}`;
      const res = await apiClient.post<WpPost>(endpoint, {
        meta: { rank_math_title: title },
      });

      apiClient
        .post('rankmath/v1/updateMeta', {
          objectID: post_id,
          objectType: post_type,
          meta: { rank_math_title: title },
        })
        .catch(() => null);

      return createFilteredResponse(res, 'rankmath');
    }
  );

  // 4. Cập nhật riêng mô tả SEO RankMath
  server.tool(
    'wp_rankmath_set_description',
    'Cập nhật riêng mô tả SEO Meta Description RankMath (rank_math_description) cho bài viết hoặc trang.',
    {
      post_id: z.number().int().positive().describe('ID của bài viết hoặc trang'),
      post_type: z.enum(['post', 'page']).default('post').describe('Loại nội dung (post hoặc page, mặc định post)'),
      description: z.string().min(1).max(320).describe('Mô tả SEO mới (khuyến nghị 120-160 ký tự, chứa Focus Keyword và CTA)'),
    },
    async ({ post_id, post_type, description }) => {
      const endpoint = post_type === 'page' ? `pages/${post_id}` : `posts/${post_id}`;
      const res = await apiClient.post<WpPost>(endpoint, {
        meta: { rank_math_description: description },
      });

      apiClient
        .post('rankmath/v1/updateMeta', {
          objectID: post_id,
          objectType: post_type,
          meta: { rank_math_description: description },
        })
        .catch(() => null);

      return createFilteredResponse(res, 'rankmath');
    }
  );

  // 5. Cập nhật từ khóa SEO RankMath (1 chính + 4 phụ)
  server.tool(
    'wp_rankmath_set_keywords',
    'Cập nhật từ khóa RankMath SEO cho bài viết gồm đúng 1 từ khóa chính và tối đa 4 từ khóa phụ (LSI).',
    {
      post_id: z.number().int().positive().describe('ID của bài viết hoặc trang'),
      post_type: z.enum(['post', 'page']).default('post').describe('Loại nội dung (post hoặc page, mặc định post)'),
      primary_keyword: z.string().min(1).describe('Từ khóa chính (Focus Keyword đầu tiên)'),
      secondary_keywords: z.array(z.string().min(1)).max(4).optional().describe('Danh sách tối đa 4 từ khóa phụ (LSI keywords)'),
    },
    async ({ post_id, post_type, primary_keyword, secondary_keywords = [] }) => {
      const focusKeywordsString = buildFocusKeywordString(primary_keyword, secondary_keywords);
      const endpoint = post_type === 'page' ? `pages/${post_id}` : `posts/${post_id}`;

      const res = await apiClient.post<WpPost>(endpoint, {
        meta: { rank_math_focus_keyword: focusKeywordsString },
      });

      apiClient
        .post('rankmath/v1/updateMeta', {
          objectID: post_id,
          objectType: post_type,
          meta: { rank_math_focus_keyword: focusKeywordsString },
        })
        .catch(() => null);

      const resObj = res as unknown as ApiResponse<WpPost>;
      if (resObj.status === 'error') {
        return createCustomResponse(res);
      }

      return createCustomResponse({
        status: 'success',
        message: `Đã cập nhật bộ từ khóa RankMath SEO (1 chính + ${secondary_keywords.length} phụ) cho ${post_type} #${post_id}`,
        data: {
          postId: post_id,
          postType: post_type,
          primaryKeyword: primary_keyword.trim(),
          secondaryKeywords: secondary_keywords.map((k) => k.trim()),
          focusKeywordsRaw: focusKeywordsString,
        },
      });
    }
  );
}