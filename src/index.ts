/**
 * Điểm khởi chạy chính của WordPress MCP Server
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { registerCommentTools } from './tools/comment.tools.js';
import { registerMediaTools } from './tools/media.tools.js';
import { registerPageTools } from './tools/page.tools.js';
import { registerPostTools } from './tools/post.tools.js';
import { registerRankMathTools } from './tools/rankmath.tools.js';
import { registerSystemTools } from './tools/system.tools.js';
import { registerTaxonomyTools } from './tools/taxonomy.tools.js';

// Khởi tạo máy chủ MCP
const server = new McpServer({
  name: config.serverName,
  version: config.serverVersion,
});

// Đăng ký toàn bộ các nhóm công cụ WordPress & RankMath SEO
registerPostTools(server);
registerPageTools(server);
registerMediaTools(server);
registerTaxonomyTools(server);
registerCommentTools(server);
registerSystemTools(server);
registerRankMathTools(server);

// Stdio transport là chuẩn kết nối MCP cho AI client (Claude Desktop, Claude Code, Cursor)
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${config.serverName}] WordPress MCP Server đang chạy qua stdio...`);
}

main().catch((error) => {
  console.error(`[${config.serverName}] Khởi động thất bại:`, error);
  process.exit(1);
});
