/**
 * Kiểm tra tự động (Self-check) sử dụng node:test và node:assert
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressApiClient } from '../src/client.js';
import { config } from '../src/config.js';
import { registerMediaTools } from '../src/tools/media.tools.js';
import { registerPageTools } from '../src/tools/page.tools.js';
import { registerPostTools } from '../src/tools/post.tools.js';
import { registerRankMathTools } from '../src/tools/rankmath.tools.js';
import { registerSystemTools } from '../src/tools/system.tools.js';
import { registerTaxonomyTools } from '../src/tools/taxonomy.tools.js';

test('Cấu hình mặc định của WordPress MCP Server', () => {
  assert.equal(config.serverName, 'wordpress-mcp-nodejs');
  assert.equal(config.serverVersion, '1.2.0');
  assert.ok(config.wpUrl.length > 0);
});

test('WordPressApiClient xử lý chuẩn hóa Base URL', () => {
  const client1 = new WordPressApiClient('https://example.com');
  assert.equal((client1 as unknown as { baseUrl: string }).baseUrl, 'https://example.com/wp-json/wp/v2');

  const client2 = new WordPressApiClient('https://example.com/wp-json');
  assert.equal((client2 as unknown as { baseUrl: string }).baseUrl, 'https://example.com/wp-json/wp/v2');

  const client3 = new WordPressApiClient('https://example.com/wp-json/wp/v2/');
  assert.equal((client3 as unknown as { baseUrl: string }).baseUrl, 'https://example.com/wp-json/wp/v2');
});

test('WordPressApiClient xử lý bắt lỗi kết nối mạng chuẩn format', async () => {
  const client = new WordPressApiClient('http://non-existent-wp-server.local:9999', 'user', 'pass');
  const res = await client.get('posts', { search: 'Test Post', page: 1 });

  assert.equal(res.status, 'error');
  assert.equal(res.error_code, 'CLIENT_NETWORK_ERROR');
  assert.match(res.message || '', /non-existent-wp-server/);
});

test('Đăng ký đầy đủ toàn bộ các MCP Tools WordPress', () => {
  const server = new McpServer({
    name: 'test-server',
    version: '1.0.0',
  });

  registerPostTools(server);
  registerPageTools(server);
  registerMediaTools(server);
  registerTaxonomyTools(server);
  registerSystemTools(server);
  registerRankMathTools(server);

  const registeredToolNames = Object.keys(
    (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools || {}
  );

  const expectedTools = [
    // Posts
    'wp_post_list',
    'wp_post_get',
    'wp_post_create',
    'wp_post_update',
    'wp_post_delete',
    'wp_post_meta_get_image_prompts',
    'wp_post_meta_update_image_prompts',
    'wp_post_meta_add_image_prompt',
    // Pages
    'wp_page_list',
    'wp_page_get',
    'wp_page_create',
    'wp_page_update',
    'wp_page_delete',
    // Media
    'wp_media_list',
    'wp_media_get',
    'wp_media_upload',
    'wp_media_update',
    'wp_media_delete',
    'wp_media_list_missing_alt',
    // Taxonomies
    'wp_category_list',
    'wp_category_get',
    'wp_tag_list',
    'wp_tag_get',
    'wp_tag_create',
    'wp_tag_delete',
    // System & User
    'wp_user_me',
    'wp_system_info',
    // RankMath SEO
    'wp_rankmath_get_seo',
    'wp_rankmath_update_seo',
    'wp_rankmath_set_title',
    'wp_rankmath_set_description',
    'wp_rankmath_set_keywords',
  ];

  for (const toolName of expectedTools) {
    assert.ok(registeredToolNames.includes(toolName), `Thiếu MCP Tool: ${toolName}`);
  }
  assert.equal(registeredToolNames.length, expectedTools.length);
});

test('Validation schema của các tools phản ánh đúng quy tắc WordPress REST API', () => {
  const server = new McpServer({
    name: 'test-server',
    version: '1.0.0',
  });

  registerPostTools(server);
  registerPageTools(server);
  registerMediaTools(server);
  registerTaxonomyTools(server);
  registerSystemTools(server);
  registerRankMathTools(server);

  const tools = (
    server as unknown as {
      _registeredTools: Record<string, { inputSchema: { safeParse: (val: unknown) => { success: boolean } } }>;
    }
  )._registeredTools;

  // 1. wp_post_create & wp_post_list
  assert.equal(
    tools.wp_post_create.inputSchema.safeParse({
      title: 'Bài viết mới',
      content: '<!-- wp:paragraph --><p>Nội dung</p><!-- /wp:paragraph -->',
      status: 'draft',
      categories: [1, 2],
    }).success,
    true
  );
  assert.equal(tools.wp_post_create.inputSchema.safeParse({ title: '' }).success, false, 'Tiêu đề không được để trống');

  assert.equal(
    tools.wp_post_list.inputSchema.safeParse({
      search: 'tin tức',
      per_page: 50,
      fields: ['id', 'title.rendered', 'content.rendered:full'],
      render_mode: 'minimal',
    }).success,
    true
  );
  assert.equal(tools.wp_post_list.inputSchema.safeParse({ per_page: 150 }).success, false, 'per_page tối đa là 100');
  assert.equal(
    tools.wp_media_list.inputSchema.safeParse({
      per_page: 20,
      fields: ['id', 'source_url', 'alt_text'],
      render_mode: 'full',
    }).success,
    true
  );

  // 2. wp_rankmath_set_keywords (1 chính, tối đa 4 phụ)
  assert.equal(
    tools.wp_rankmath_set_keywords.inputSchema.safeParse({
      post_id: 1,
      primary_keyword: 'WordPress SEO',
      secondary_keywords: ['SEO bài viết', 'Tối ưu RankMath', 'Cách cài RankMath', 'Điểm SEO 100'],
    }).success,
    true
  );
  assert.equal(
    tools.wp_rankmath_set_keywords.inputSchema.safeParse({
      post_id: 1,
      primary_keyword: 'WordPress SEO',
      secondary_keywords: ['Phụ 1', 'Phụ 2', 'Phụ 3', 'Phụ 4', 'Phụ 5 vượt quá 4 từ'],
    }).success,
    false,
    'Tối đa 4 từ khóa phụ'
  );
  assert.equal(
    tools.wp_rankmath_set_keywords.inputSchema.safeParse({
      post_id: 1,
      primary_keyword: '',
    }).success,
    false,
    'Từ khóa chính không được để trống'
  );

  // 5. wp_rankmath_set_title & wp_rankmath_set_description
  assert.equal(
    tools.wp_rankmath_set_title.inputSchema.safeParse({
      post_id: 1,
      title: 'Bí Quyết Tối Ưu RankMath SEO 2026',
    }).success,
    true
  );
  assert.equal(
    tools.wp_rankmath_set_description.inputSchema.safeParse({
      post_id: 1,
      description: 'Khám phá hướng dẫn tối ưu RankMath SEO chi tiết giúp bài viết đạt 100/100 điểm. Xem ngay!',
    }).success,
    true
  );
});
