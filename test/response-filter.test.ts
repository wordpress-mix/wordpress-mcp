/**
 * Unit tests cho bộ lọc Response Filter (src/lib/response-filter.ts)
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterObject,
  pickFields,
  createFilteredResponse,
  createCustomResponse,
} from '../src/lib/response-filter.js';

const mockPost = {
  id: 101,
  date: '2026-11-17T00:00:00',
  slug: 'bai-viet-mau',
  status: 'publish',
  type: 'post',
  link: 'https://example.com/bai-viet-mau',
  guid: { rendered: 'https://example.com/?p=101' },
  _links: { self: [{ href: 'https://example.com/wp-json/wp/v2/posts/101' }] },
  class_list: ['post-101', 'type-post'],
  title: {
    rendered: 'Tiêu đề bài viết',
    raw: 'Tiêu đề bài viết gốc',
    protected: false,
  },
  content: {
    rendered: '<p>Nội dung bài viết</p>',
    raw: '<!-- wp:paragraph --><p>Nội dung bài viết</p><!-- /wp:paragraph -->',
    protected: false,
  },
  excerpt: {
    rendered: '<p>Tóm tắt bài viết</p>',
    raw: 'Tóm tắt bài viết',
  },
  author: 1,
  featured_media: 55,
  categories: [2, 3],
  tags: [10],
  meta: {
    rank_math_title: 'SEO Title',
  },
};

test('filterObject: loại bỏ các trường thừa (_links, guid, class_list) ở chế độ minimal', () => {
  const filtered = filterObject(mockPost, 'post', 'minimal');

  assert.equal(filtered.id, 101);
  assert.equal(filtered.slug, 'bai-viet-mau');
  assert.equal(filtered._links, undefined, '_links phải bị loại bỏ');
  assert.equal(filtered.guid, undefined, 'guid phải bị loại bỏ');
  assert.equal(filtered.class_list, undefined, 'class_list phải bị loại bỏ');

  // Kiểm tra WpRendered: raw và protected phải bị xóa ở minimal
  const title = filtered.title as Record<string, unknown>;
  assert.equal(title.rendered, 'Tiêu đề bài viết');
  assert.equal(title.raw, undefined, 'raw phải bị ẩn ở minimal mode');
  assert.equal(title.protected, undefined, 'protected phải bị ẩn ở minimal mode');
});

test('filterObject: giữ lại toàn bộ trường kể cả _links và raw ở chế độ full', () => {
  const filtered = filterObject(mockPost, 'post', 'full');

  assert.equal(filtered.id, 101);
  assert.ok(filtered._links !== undefined, '_links phải được giữ lại ở full mode');
  assert.ok(filtered.guid !== undefined, 'guid phải được giữ lại ở full mode');

  const title = filtered.title as Record<string, unknown>;
  assert.equal(title.raw, 'Tiêu đề bài viết gốc');
  assert.equal(title.protected, false);
});

test('pickFields: chỉ chọn các trường được chỉ định (flat fields)', () => {
  const result = pickFields(mockPost, ['id', 'slug', 'status']);

  assert.deepEqual(Object.keys(result).sort(), ['id', 'slug', 'status'].sort());
  assert.equal(result.id, 101);
  assert.equal(result.slug, 'bai-viet-mau');
  assert.equal(result.status, 'publish');
});

test('pickFields: hỗ trợ chọn nested fields (title.rendered, excerpt.rendered)', () => {
  const result = pickFields(mockPost, ['id', 'title.rendered']);

  assert.equal(result.id, 101);
  assert.deepEqual(result.title, { rendered: 'Tiêu đề bài viết' });
  assert.equal((result.title as Record<string, unknown>).raw, undefined);
  assert.equal(result.content, undefined);
});

test('pickFields: hỗ trợ suffix mode (:minimal và :full) cho từng trường', () => {
  const result = pickFields(mockPost, ['id', 'title:minimal', 'content:full']);

  assert.equal(result.id, 101);

  // title:minimal -> không có raw
  const title = result.title as Record<string, unknown>;
  assert.equal(title.rendered, 'Tiêu đề bài viết');
  assert.equal(title.raw, undefined);

  // content:full -> có raw
  const content = result.content as Record<string, unknown>;
  assert.equal(content.rendered, '<p>Nội dung bài viết</p>');
  assert.equal(content.raw, '<!-- wp:paragraph --><p>Nội dung bài viết</p><!-- /wp:paragraph -->');
});

test('createFilteredResponse: bọc kết quả chuẩn định dạng MCP text content và giữ pagination headers', () => {
  const apiResponse = {
    status: 'success',
    data: [mockPost],
    total: 100,
    totalPages: 10,
  };

  const response = createFilteredResponse(apiResponse, 'post', 'minimal', ['id', 'title.rendered']);
  assert.ok(Array.isArray(response.content));
  assert.equal(response.content[0].type, 'text');

  const parsed = JSON.parse(response.content[0].text);
  assert.equal(parsed.status, 'success');
  assert.equal(parsed.total, 100);
  assert.equal(parsed.totalPages, 10);
  assert.equal(parsed.data.length, 1);
  assert.deepEqual(parsed.data[0], {
    id: 101,
    title: { rendered: 'Tiêu đề bài viết' },
  });
});

test('createFilteredResponse: giữ nguyên response nếu status là error', () => {
  const errorResponse = {
    status: 'error',
    error_code: 'NOT_FOUND',
    message: 'Không tìm thấy bài viết',
  };

  const response = createFilteredResponse(errorResponse, 'post');
  const parsed = JSON.parse(response.content[0].text);
  assert.equal(parsed.status, 'error');
  assert.equal(parsed.error_code, 'NOT_FOUND');
  assert.equal(parsed.message, 'Không tìm thấy bài viết');
});

test('createCustomResponse: bọc đúng JSON payload tùy biến', () => {
  const payload = { status: 'success', customKey: 123 };
  const response = createCustomResponse(payload);
  const parsed = JSON.parse(response.content[0].text);
  assert.deepEqual(parsed, payload);
});
