# WordPress MCP Server

Model Context Protocol (MCP) server xây dựng bằng **Node.js** & **TypeScript** cung cấp bộ công cụ (tools) cho AI Agent tương tác, quản trị và thao tác trực tiếp với hệ sinh thái **WordPress** thông qua WordPress REST API.

---

## Tính Năng & Danh Sách Tools

### 1. Quản lý Bài viết (Posts)
- `wp_post_list`: Tìm kiếm, lọc theo trạng thái (`draft`/`publish`/`trash`), chuyên mục, tag, tác giả và phân trang danh sách bài viết.
- `wp_post_get`: Lấy chi tiết bài viết (hỗ trợ `context=edit` để lấy raw Gutenberg blocks).
- `wp_post_create`: Tạo bài viết mới ở trạng thái nháp (`draft`) hoặc xuất bản (`publish`), hỗ trợ Gutenberg blocks, categories, tags, featured image và SEO meta.
- `wp_post_update`: Cập nhật tiêu đề, nội dung Gutenberg, trạng thái, danh mục hoặc tag bài viết.
- `wp_post_delete`: Xóa bài viết (hỗ trợ đưa vào thùng rác `trash` hoặc xóa vĩnh viễn với `force=true`).

### 2. Quản lý Trang tĩnh (Pages)
- `wp_page_list`: Tìm kiếm và phân trang danh sách các trang tĩnh.
- `wp_page_get`: Lấy chi tiết trang tĩnh kèm raw Gutenberg blocks.
- `wp_page_create`: Tạo trang tĩnh mới.
- `wp_page_update`: Cập nhật tiêu đề, nội dung và trạng thái trang tĩnh.
- `wp_page_delete`: Xóa trang tĩnh (thùng rác hoặc vĩnh viễn).

### 3. Quản lý Media & Tải tệp (Media)
- `wp_media_list`: Xem danh sách hình ảnh, video và tệp đính kèm có phân trang.
- `wp_media_get`: Chi tiết tệp media, URL gốc và các kích cỡ ảnh đã sinh tự động.
- `wp_media_upload`: Tải file ảnh/media lên WordPress kèm `alt_text`, `title`, `caption`, và gắn trực tiếp vào `post_id`.
- `wp_media_update`: Cập nhật thông tin tệp media theo ID (bổ sung `alt_text`, `title`, `caption`, `description`, `post`).
- `wp_media_delete`: Xóa tệp media khỏi thư viện WordPress.
- `wp_media_list_missing_alt`: Liệt kê các tệp media (mặc định ảnh) còn thiếu alt_text để kiểm tra và bổ sung SEO/accessibility.

### 4. Quản lý Phân loại (Taxonomies: Categories & Tags)
- `wp_category_list`: Danh sách chuyên mục (categories), hỗ trợ phân trang và tìm kiếm.
- `wp_category_get`: Chi tiết chuyên mục kèm số lượng bài viết và mô tả.
- `wp_category_create`: Tạo chuyên mục mới (hỗ trợ `parent`, `slug`, `description`).
- `wp_tag_list`: Danh sách thẻ bài viết (tags).
- `wp_tag_get`: Chi tiết thẻ bài viết.
- `wp_tag_create`: Tạo thẻ bài viết mới.

### 5. Hệ Thống & Tài Khoản (System & User)
- `wp_user_me`: Lấy thông tin tài khoản người dùng đang kết nối, quyền hạn và vai trò (roles, capabilities).
- `wp_system_info`: Kiểm tra trạng thái kết nối WordPress REST API, URL website, phiên bản WordPress và múi giờ hệ thống.

### 6. Tối Ưu SEO với RankMath (RankMath SEO)
- `wp_rankmath_get_seo`: Lấy chi tiết siêu dữ liệu SEO của bài viết hoặc trang (tiêu đề SEO, mô tả SEO, từ khóa chính và danh sách từ khóa phụ).
- `wp_rankmath_update_seo`: Cập nhật toàn diện siêu dữ liệu SEO (tiêu đề, mô tả, từ khóa 1 chính + tối đa 4 phụ, canonical URL).
- `wp_rankmath_set_title`: Cập nhật riêng tiêu đề SEO RankMath (`rank_math_title`, khuyến nghị 50-60 ký tự).
- `wp_rankmath_set_description`: Cập nhật riêng mô tả SEO Meta Description (`rank_math_description`, khuyến nghị 120-160 ký tự, kèm CTA).
- `wp_rankmath_set_keywords`: Cập nhật bộ từ khóa SEO gồm đúng 1 từ khóa chính (`primary_keyword`) và tối đa 4 từ khóa phụ (`secondary_keywords`), tự động format theo định dạng chuẩn của RankMath.

### 7. Tối Ưu Hóa Token & Bộ Lọc Phản Hồi (Token Optimization & Response Filter)
Tất cả các công cụ danh sách và chi tiết (`wp_post_*`, `wp_page_*`, `wp_media_*`, `wp_category_*`, `wp_tag_*`) đều được tích hợp bộ lọc phản hồi thông minh:
- **Tự động tinh giản (Minimal mode)**: Loại bỏ các trường siêu dữ liệu cồng kềnh của WordPress (`_links`, `guid`, `class_list`, `wp:*`, `curies`, `about`...) và ẩn trường `raw`/`protected` không cần thiết, giúp tiết kiệm tới 70-80% token cho AI Agent.
- **Chọn trường linh hoạt kiểu GraphQL (`fields`)**: Hỗ trợ chỉ định chính xác danh sách trường cần lấy (ví dụ `fields: ["id", "title.rendered", "slug"]`) hoặc chỉ định mode từng trường (`content.rendered:full`).
- **Chế độ đầy đủ (`render_mode: full`)**: Giữ lại toàn bộ dữ liệu gốc của WordPress REST API khi cần kiểm tra chuyên sâu.

---

## Cài Đặt & Build

### Yêu Cầu Môi Trường
- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`

### Cài Đặt Dependencies
```bash
npm install
```

### Chạy Kiểm Thử (Tests)
```bash
npm test
```

### Build Ra 1 File Duy Nhất (Single Bundle)
Đóng gói toàn bộ mã nguồn và dependencies thành 1 file độc lập với `esbuild`:
```bash
npm run build
```

Kết quả tạo ra đúng **1 file duy nhất** tại [dist/index.js](dist/index.js) (đã nhúng shebang `#!/usr/bin/env node` và sẵn sàng thực thi trực tiếp mà không cần phụ thuộc vào thư mục `node_modules`).

---

## Cấu Hình Kết Nối MCP

### 1. Biến Môi Trường (.env)
Tạo file `.env` từ [.env.example](.env.example):
```env
WP_URL=https://your-wordpress-site.com
WP_USERNAME=your_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

> **Lưu ý về WordPress Application Password**:
> Vào trang quản trị WordPress -> **Users (Thành viên)** -> **Profile (Hồ sơ của bạn)** -> cuộn xuống mục **Application Passwords (Mật khẩu ứng dụng)** -> Nhập tên ứng dụng và nhấn **Add New Application Password**.

### 2. Cách 1: Sử dụng trực tiếp qua NPM với `npx` (Khuyên dùng - Không cần path file)
Khi package được xuất bản lên NPM Registry với tên [`wordpress-mcp-nodejs`](https://www.npmjs.com/package/wordpress-mcp-nodejs), bạn có thể cấu hình client chạy trực tiếp mà **không cần clone mã nguồn hay khai báo đường dẫn file**:

#### Cấu hình Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": [
        "-y",
        "wordpress-mcp-nodejs@latest"
      ],
      "env": {
        "WP_URL": "https://your-wordpress-site.com",
        "WP_USERNAME": "your_username",
        "WP_APP_PASSWORD": "your_application_password"
      }
    }
  }
}
```

#### Cấu hình Claude Code (`.mcp.json`)
```json
{
  "mcpServers": {
    "wordpress": {
      "command": "npx",
      "args": ["-y", "wordpress-mcp-nodejs@latest"],
      "env": {
        "WP_URL": "https://your-wordpress-site.com",
        "WP_USERNAME": "your_username",
        "WP_APP_PASSWORD": "your_application_password"
      }
    }
  }
}
```

### 3. Cách 2: Chạy từ mã nguồn Local (Dành cho nhà phát triển)
Nếu bạn đang phát triển hoặc muốn chạy trực tiếp file bundle sau khi `npm run build`:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "WP_URL": "https://your-wordpress-site.com",
        "WP_USERNAME": "your_username",
        "WP_APP_PASSWORD": "your_application_password"
      }
    }
  }
}
```

---

## Cấu Trúc Mã Nguồn

```text
├── src/
│   ├── index.ts              # Điểm khởi chạy MCP Server & đăng ký công cụ
│   ├── config.ts             # Quản lý biến môi trường và cấu hình
│   ├── types.ts              # Định nghĩa Types & DTOs
│   ├── client.ts             # HTTP Client gọi WordPress REST API (/wp-json/wp/v2)
│   └── tools/
│       ├── post.tools.ts     # Các công cụ quản lý Bài viết
│       ├── page.tools.ts     # Các công cụ quản lý Trang tĩnh
│       ├── media.tools.ts    # Các công cụ quản lý Media
│       ├── taxonomy.tools.ts # Các công cụ quản lý Categories & Tags
│       ├── system.tools.ts   # Công cụ kiểm tra hệ thống và tài khoản
│       └── rankmath.tools.ts # Các công cụ tối ưu RankMath SEO (tiêu đề, mô tả, từ khóa)
├── test/
│   └── self-check.test.ts    # Unit test tự động
├── dist/                     # Thư mục chứa 1 file bundle duy nhất sau khi build
├── .env.example              # Mẫu biến môi trường
├── package.json
└── tsconfig.json
```
