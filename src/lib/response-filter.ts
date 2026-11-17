/**
 * Bộ lọc phản hồi (Response Filter) cho WordPress MCP Server
 * Loại bỏ các trường không cần thiết khỏi phản hồi API để giảm kích thước token
 */

export type ResourceType =
  | 'post'
  | 'page'
  | 'category'
  | 'tag'
  | 'media'
  | 'user'
  | 'system'
  | 'rankmath';

export type RenderMode = 'minimal' | 'full';

const DEFAULT_RENDER_MODE: RenderMode = 'minimal';

/**
 * Các trường mặc định sẽ bị loại bỏ khỏi mọi response (dùng cho chế độ minimal)
 */
const DEFAULT_EXCLUDE_FIELDS = new Set([
  '_links',
  'guid',
  'permalink_template',
  'generated_slug',
]);

/**
 * Các trường được phép giữ lại (whitelist) cho từng loại resource ở chế độ minimal
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
 * Full whitelist - keeps ALL WordPress REST API fields
 * Used when renderMode === 'full'
 */
const FULL_WHITELIST_FIELDS: Record<string, Set<string>> = {
  post: new Set([
    'id', 'date', 'date_gmt', 'modified', 'modified_gmt',
    'slug', 'status', 'type', 'link', 'guid',
    'title', 'content', 'excerpt',
    'author', 'featured_media', 'comment_status', 'ping_status',
    'sticky', 'template', 'format', 'categories', 'tags',
    'meta', '_links', 'class_list', 'permalink_template',
    'generated_slug', 'version-history', 'predecessor-version',
    'wp:action-publish', 'wp:action-unfiltered-html', 'wp:action-sticky',
    'wp:action-assign-author', 'wp:action-create-categories',
    'wp:action-assign-categories', 'wp:action-create-tags',
    'wp:action-assign-tags', 'wp:attachment', 'wp:term',
    'wp:featuredmedia', 'about', 'collection', 'self',
    'replies', 'author', 'curies', 'wp:attachment',
    'wp:attached-to',
  ]),
  page: new Set([
    'id', 'date', 'date_gmt', 'modified', 'modified_gmt',
    'slug', 'status', 'type', 'link', 'guid',
    'title', 'content', 'excerpt',
    'author', 'featured_media', 'parent', 'menu_order',
    'comment_status', 'ping_status', 'template', 'meta',
    '_links', 'class_list', 'permalink_template',
    'generated_slug', 'version-history', 'predecessor-version',
    'wp:action-publish', 'wp:action-unfiltered-html',
    'wp:action-assign-author', 'about', 'collection', 'self',
    'replies', 'author', 'curies', 'wp:attachment',
  ]),
  category: new Set([
    'id', 'count', 'description', 'link', 'name', 'slug', 'taxonomy',
    'parent', 'meta', '_links', 'about', 'collection', 'self',
    'up', 'wp:post_type', 'curies',
  ]),
  tag: new Set([
    'id', 'count', 'description', 'link', 'name', 'slug', 'taxonomy',
    'meta', '_links', 'about', 'collection', 'self',
    'wp:post_type', 'curies',
  ]),
  media: new Set([
    'id', 'date', 'date_gmt', 'modified', 'modified_gmt',
    'slug', 'status', 'type', 'link', 'guid',
    'title', 'author', 'comment_status', 'ping_status', 'template',
    'description', 'caption', 'alt_text', 'media_type', 'mime_type',
    'media_details', 'post', 'source_url', 'filename', 'filesize',
    'exif_orientation', 'image_output_format', 'image_save_progressive',
    'image_quality', 'missing_image_sizes', 'meta',
    '_links', 'about', 'collection', 'self', 'author', 'replies',
    'wp:attached-to', 'curies',
  ]),
  user: new Set([
    'id', 'username', 'name', 'first_name', 'last_name',
    'email', 'url', 'description', 'link', 'locale',
    'nickname', 'slug', 'roles', 'registered_date',
    'capabilities', 'extra_capabilities', 'avatar_urls', 'meta',
    '_links', 'about', 'collection', 'self', 'curies',
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
 * Lấy whitelist phù hợp với render mode
 */
function getWhitelist(resourceType?: ResourceType, renderMode: RenderMode = DEFAULT_RENDER_MODE): Set<string> | undefined {
  if (!resourceType) {
    return undefined;
  }
  if (renderMode === 'full') {
    return FULL_WHITELIST_FIELDS[resourceType];
  }
  return WHITELIST_FIELDS[resourceType];
}

/**
 * Chọn chỉ các trường được yêu cầu (giống GraphQL field selection).
 * Hỗ trợ đường dẫn lồng nhau, ví dụ "title.rendered", "content.rendered".
 * Nếu item không có trường nào được chọn, trả về {} để caller tự quyết định giữ/bỏ.
 */
/**
 * Phân tích một entry field, tách phần suffix chế độ render (:minimal hoặc :full).
 * Ví dụ: "title:full" -> { spec: "title", mode: "full" }
 *         "title.rendered:minimal" -> { spec: "title.rendered", mode: "minimal" }
 */
function parseFieldEntry(entry: string, globalMode: RenderMode): { spec: string; mode: RenderMode } {
  const lastColon = entry.lastIndexOf(':');
  if (lastColon !== -1) {
    const suffix = entry.slice(lastColon + 1).trim().toLowerCase();
    if (suffix === 'minimal' || suffix === 'full') {
      return { spec: entry.slice(0, lastColon).trim(), mode: suffix as RenderMode };
    }
  }
  return { spec: entry.trim(), mode: globalMode };
}

export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
  renderMode: RenderMode = DEFAULT_RENDER_MODE
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Gom nhóm theo root để quyết định chế độ render tổng thể cho từng root
  // (nếu bất kỳ entry nào yêu cầu full hoặc raw, root đó được coi là full)
  const entriesByRoot = new Map<string, { specs: string[][]; mode: RenderMode; explicitRaw: boolean }>();

  for (const field of fields) {
    const { spec, mode } = parseFieldEntry(field, renderMode);
    const parts = spec.split('.').filter(Boolean);
    if (parts.length === 0) continue;
    const root = parts[0];
    const existing = entriesByRoot.get(root);
    const explicitRaw = parts.includes('raw');
    const newMode: RenderMode = (mode === 'full' || explicitRaw) ? 'full' : (existing?.mode ?? mode);
    if (!existing) {
      entriesByRoot.set(root, { specs: [parts], mode: newMode, explicitRaw: explicitRaw || false });
    } else {
      existing.specs.push(parts);
      existing.mode = (existing.mode === 'full' || newMode === 'full') ? 'full' : existing.mode;
      existing.explicitRaw = existing.explicitRaw || explicitRaw;
    }
  }

  for (const [root, info] of entriesByRoot) {
    if (!(root in obj)) continue;

    // Chọn các đường dẫn con cho root này
    const selectedSpecs = info.specs;
    const rootResult: Record<string, unknown> = {};

    for (const parts of selectedSpecs) {
      if (parts.length === 1) {
        rootResult.__whole = true;
      } else {
        const nested = pickNested(obj[root] as Record<string, unknown>, parts.slice(1));
        if (nested !== undefined) {
          // merge nested
          for (const [k, v] of Object.entries(nested)) {
            if (v && typeof v === 'object' && !Array.isArray(v) && rootResult[k] && typeof rootResult[k] === 'object') {
              rootResult[k] = { ...(rootResult[k] as Record<string, unknown>), ...(v as Record<string, unknown>) };
            } else {
              rootResult[k] = v;
            }
          }
        }
      }
    }

    // Nếu có entry chỉ định root nguyên vẹn, lấy toàn bộ object gốc
    if (rootResult.__whole) {
      delete rootResult.__whole;
      const src = obj[root];
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        const merged = { ...(src as Record<string, unknown>), ...rootResult };
        result[root] = info.mode === 'minimal' && !info.explicitRaw
          ? stripRaw(merged)
          : merged;
      } else {
        result[root] = src;
      }
    } else {
      // Chỉ chọn các trường con được chỉ định
      const built: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rootResult)) {
        built[k] = v;
      }
      if (Object.keys(built).length === 0) {
        // fallback: nếu không chọn được gì, thử lấy nguyên vẹn
        const src = obj[root];
        if (src && typeof src === 'object' && !Array.isArray(src)) {
          result[root] = info.mode === 'minimal' && !info.explicitRaw ? stripRaw({ ...(src as Record<string, unknown>) }) : { ...(src as Record<string, unknown>) };
        } else {
          result[root] = src;
        }
      } else {
        result[root] = info.mode === 'minimal' && !info.explicitRaw ? stripRaw(built) : built;
      }
    }
  }

  return result;
}

/**
 * Xác định đây có phải đối tượng field của WordPress dạng { rendered, raw?, protected? } không.
 */
function isWpRenderedField(obj: Record<string, unknown>): boolean {
  return 'rendered' in obj || 'raw' in obj || 'protected' in obj;
}

/**
 * Khi ở chế độ minimal và không yêu cầu raw rõ ràng, ẩn trường raw và protected khỏi đối tượng WpRendered.
 * Với object thường, đệ quy vào các con.
 */
function stripRaw(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripRaw(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const dropRaw = isWpRenderedField(obj);
  for (const [key, val] of Object.entries(obj)) {
    if (dropRaw && (key === 'raw' || key === 'protected')) {
      continue;
    }
    result[key] = stripRaw(val);
  }
  return result;
}

/**
 * Lọc đệ quy theo các phần đường dẫn còn lại, trả về subtree đã chọn
 */
function pickNested(obj: Record<string, unknown>, parts: string[]): Record<string, unknown> | undefined {
  const [head, ...rest] = parts;
  if (!(head in obj)) {
    return undefined;
  }
  const value = obj[head];
  if (rest.length === 0) {
    return { [head]: value };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nested = pickNested(value as Record<string, unknown>, rest);
    if (nested !== undefined) {
      return { [head]: nested };
    }
  }
  return undefined;
}

/**
 * Lọc một object, xóa các trường không mong muốn
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  resourceType?: ResourceType,
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
  fields?: string[]
): Record<string, unknown> {
  // Chế độ chọn trường thủ công (giống GraphQL) - ưu tiên cao nhất
  if (fields && fields.length > 0) {
    return pickFields(obj, fields, renderMode);
  }

  const whitelist = getWhitelist(resourceType, renderMode);
  const result: Record<string, unknown> = {};
  const dropRaw = renderMode === 'minimal' && isWpRenderedField(obj);

  for (const [key, value] of Object.entries(obj)) {
    // Luôn loại bỏ các trường trong DEFAULT_EXCLUDE_FIELDS ở chế độ minimal
    if (renderMode === 'minimal' && DEFAULT_EXCLUDE_FIELDS.has(key)) {
      continue;
    }
    if (dropRaw && (key === 'raw' || key === 'protected')) {
      continue;
    }
    if (whitelist && whitelist.size > 0 && !whitelist.has(key)) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = filterNestedObject(value as Record<string, unknown>, resourceType, renderMode);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' ? filterNestedObject(item as Record<string, unknown>, resourceType, renderMode) : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Lọc nested object (áp dụng whitelist tương tự)
 */
function filterNestedObject(obj: Record<string, unknown>, resourceType?: ResourceType, renderMode: RenderMode = DEFAULT_RENDER_MODE): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const dropRaw = renderMode === 'minimal' && isWpRenderedField(obj);

  for (const [key, value] of Object.entries(obj)) {
    if (renderMode === 'minimal' && DEFAULT_EXCLUDE_FIELDS.has(key)) {
      continue;
    }
    if (dropRaw && (key === 'raw' || key === 'protected')) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = filterNestedObject(value as Record<string, unknown>, resourceType, renderMode);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' ? filterNestedObject(item as Record<string, unknown>, resourceType, renderMode) : item
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
  resourceType?: ResourceType,
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
  fields?: string[]
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
          ? filterObject(item as Record<string, unknown>, resourceType, renderMode, fields)
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
        data: filterObject(data as Record<string, unknown>, resourceType, renderMode, fields),
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
        ? filterObject(item as Record<string, unknown>, resourceType, renderMode, fields)
        : item
    );
    return toMcpContent({ status: 'success', data: filtered });
  }

  // Plain object
  return toMcpContent(filterObject(obj, resourceType, renderMode, fields));
}

/**
 * Tạo response cho custom payload (không phải từ API trực tiếp)
 */
export function createCustomResponse(payload: unknown) {
  return toMcpContent(payload);
}