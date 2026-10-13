/**
 * Kiểm tra tự động (Self-check) sử dụng node:test và node:assert
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WordPressApiClient } from '../src/client.js';
import { config } from '../src/config.js';
import { registerCommentTools } from '../src/tools/comment.tools.js';
import { registerMediaTools } from '../src/tools/media.tools.js';
import { registerPageTools } from '../src/tools/page.tools.js';
import { registerPostTools } from '../src/tools/post.tools.js';
import { registerSystemTools } from '../src/tools/system.tools.js';
import { registerTaxonomyTools } from '../src/tools/taxonomy.tools.js';

test('Cấu hình mặc định của WordPress MCP Server', () => {
  assert.equal(config.serverName, 'wordpress-mcp');
  assert.equal(config.serverVersion, '1.0.0');
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
  registerCommentTools(server);
  registerSystemTools(server);

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
    'wp_media_delete',
    // Taxonomies
    'wp_category_list',
    'wp_category_get',
    'wp_category_create',
    'wp_category_update',
    'wp_category_delete',
    'wp_tag_list',
    'wp_tag_get',
    'wp_tag_create',
    'wp_tag_delete',
    // Comments
    'wp_comment_list',
    'wp_comment_get',
    'wp_comment_create',
    'wp_comment_update',
    'wp_comment_delete',
    // System & User
    'wp_user_me',
    'wp_system_info',
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
  registerCommentTools(server);
  registerSystemTools(server);

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

  assert.equal(tools.wp_post_list.inputSchema.safeParse({ search: 'tin tức', per_page: 50 }).success, true);
  assert.equal(tools.wp_post_list.inputSchema.safeParse({ per_page: 150 }).success, false, 'per_page tối đa là 100');

  // 2. wp_category_create
  assert.equal(
    tools.wp_category_create.inputSchema.safeParse({
      name: 'Công nghệ',
      slug: 'cong-nghe',
      description: 'Chuyên mục công nghệ',
    }).success,
    true
  );
  assert.equal(tools.wp_category_create.inputSchema.safeParse({ name: '' }).success, false, 'Tên chuyên mục không được trống');

  // 3. wp_comment_create
  assert.equal(
    tools.wp_comment_create.inputSchema.safeParse({
      post: 123,
      content: 'Bài viết rất hay',
      author_email: 'test@example.com',
    }).success,
    true
  );
  assert.equal(
    tools.wp_comment_create.inputSchema.safeParse({
      post: 123,
      content: 'Bình luận',
      author_email: 'not-an-email',
    }).success,
    false,
    'Email bình luận phải đúng định dạng'
  );
});
