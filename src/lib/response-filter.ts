/**
 * Bộ lọc phản hồi (Response Filter) cho WordPress MCP Server
 * Loại bỏ các trường không cần thiết khỏi phản hồi API để giảm kích thước token
 */

export type ResourceType = 'post' | 'page' | 'category' | 'tag' | 'media' | 'user' | 'system' | 'rankmath';

/**
 * Các trường mặc định sẽ bị loại bỏ khỏi mọi response
 */
const DEFAULT_EXCLUDE_FIELDS = new Set([
  '_links',
  'guid',
  'permalink_template',
  'generated_slug',
]);

/**
 * Các trường được phép giữ lại (whitelist) cho từng loại resource
 */
const WHITELIST_FIELDS: Record<string, Set<string>> = {
  post: new Set([
    'id', 'date', 'date_gmt', 'modified', 'modified_gmt',
    'slug', 'status', 'type', 'title', 'content', 'excerpt',
    'author', 'featured_media', 'comment_status', 'ping_status',
    'sticky', 'template', 'format', 'categories', 'tags',
    'meta',
  ]),
  page: new Set([
    'id', 'date', 'date_gmt', 'modified', 'modified_gmt',
    'slug', 'status', 'type', 'title', 'content', 'excerpt',
    'author', 'featured_media', 'parent', 'menu_order',
    'comment_status', 'ping_status', 'template', 'meta',
  ]),
  category: new Set([
    'id', 'count', 'description', 'name', 'slug', 'taxonomy', 'parent',
  ]),
  tag: new Set([
    'id', 'count', 'description', 'name', 'slug', 'taxonomy',
  ]),
  media: new Set([
    'id', 'date', 'date_gmt', 'modified', 'modified_gmt',
    'slug', 'status', 'type', 'title', 'author',
    'comment_status', 'ping_status', 'template',
    'description', 'caption', 'alt_text', 'media_type', 'mime_type',
    'media_details', 'post', 'source_url', 'filename', 'filesize',
    'exif_orientation', 'image_output_format', 'image_save_progressive',
    'image_quality', 'missing_image_sizes',
  ]),
  user: new Set([
    'id', 'username', 'name', 'first_name', 'last_name',
    'email', 'url', 'description', 'locale',
    'nickname', 'slug', 'roles', 'registered_date',
    'avatar_urls',
  ]),
  system: new Set([
    'siteUrl', 'restNamespace', 'serverName', 'serverVersion',
    'authenticated', 'currentUser',
  ]),
  rankmath: new Set([
    'postId', 'postType', 'title', 'description', 'primaryKeyword',
    'secondaryKeywords', 'focusKeywordsRaw', 'canonicalUrl', 'robots',
  ]),
};

/**
 * Lọc một object, xóa các trường không mong muốn
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  resourceType?: ResourceType
): Record<string, unknown> {
  const whitelist = resourceType ? WHITELIST_FIELDS[resourceType] : undefined;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (DEFAULT_EXCLUDE_FIELDS.has(key)) {
      continue;
    }
    if (whitelist && whitelist.size > 0 && !whitelist.has(key)) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = filterNestedObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' ? filterNestedObject(item as Record<string, unknown>) : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Lọc nested object (không áp dụng whitelist, chỉ loại bỏ _links/guid)
 */
function filterNestedObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (DEFAULT_EXCLUDE_FIELDS.has(key)) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = filterNestedObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' ? filterNestedObject(item as Record<string, unknown>) : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Tạo MCP response text từ payload bất kỳ
 */
function toMcpContent(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/**
 * Xử lý và lọc response từ WordPress API
 * Hỗ trợ cả ApiResponse {status, data, total, totalPages} và plain objects
 */
export function createFilteredResponse(
  res: unknown,
  resourceType?: ResourceType
) {
  if (!res || typeof res !== 'object') {
    return toMcpContent(res);
  }

  const obj = res as Record<string, unknown>;

  // Nếu là error response, trả về nguyên bản (đã nhỏ)
  if (obj.status === 'error') {
    return toMcpContent(obj);
  }

  // Nếu là ApiResponse có data
  if ('data' in obj && obj.status === 'success') {
    const data = obj.data;

    if (Array.isArray(data)) {
      const filtered = data.map((item) =>
        item && typeof item === 'object'
          ? filterObject(item as Record<string, unknown>, resourceType)
          : item
      );
      return toMcpContent({
        status: 'success',
        data: filtered,
        ...(obj.total !== undefined ? { total: obj.total } : {}),
        ...(obj.totalPages !== undefined ? { totalPages: obj.totalPages } : {}),
      });
    }

    if (data && typeof data === 'object') {
      return toMcpContent({
        status: 'success',
        data: filterObject(data as Record<string, unknown>, resourceType),
        ...(obj.total !== undefined ? { total: obj.total } : {}),
        ...(obj.totalPages !== undefined ? { totalPages: obj.totalPages } : {}),
      });
    }

    return toMcpContent(obj);
  }

  // Nếu là mảng trực tiếp
  if (Array.isArray(obj)) {
    const filtered = (obj as unknown[]).map((item) =>
      item && typeof item === 'object'
        ? filterObject(item as Record<string, unknown>, resourceType)
        : item
    );
    return toMcpContent({ status: 'success', data: filtered });
  }

  // Plain object
  return toMcpContent(filterObject(obj, resourceType));
}

/**
 * Tạo response cho custom payload (không phải từ API trực tiếp)
 */
export function createCustomResponse(payload: unknown) {
  return toMcpContent(payload);
}