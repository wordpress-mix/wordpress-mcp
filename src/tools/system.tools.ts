/**
 * Bộ công cụ kiểm tra Hệ thống & Tài khoản cho WordPress MCP Server
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../client.js';
import { config } from '../config.js';
import type { WpSystemInfo, WpUser } from '../types.js';
import { createFilteredResponse, createCustomResponse } from '../lib/response-filter.js';

export function registerSystemTools(server: McpServer): void {
  // 1. Thông tin tài khoản người dùng hiện tại
  server.tool(
    'wp_user_me',
    'Lấy thông tin tài khoản WordPress hiện đang kết nối, quyền hạn và vai trò (Roles, Capabilities).',
    {
      context: z.enum(['view', 'edit']).optional().describe('Ngữ cảnh lấy dữ liệu (edit để lấy đầy đủ quyền hạn)'),
    },
    async ({ context }) => {
      const res = await apiClient.get<WpUser>('users/me', { context: context || 'edit' });
      return createFilteredResponse(res, 'user');
    }
  );

  // 2. Thông tin hệ thống WordPress REST API
  server.tool(
    'wp_system_info',
    'Kiểm tra trạng thái kết nối tới WordPress REST API, URL website và thông tin xác thực hiện tại.',
    {},
    async () => {
      let currentUser: string | undefined;
      let authenticated = false;

      if (config.wpUsername && config.wpAppPassword) {
        const userRes = await apiClient.get<WpUser>('users/me');
        const obj = userRes as unknown as { status?: string; data?: WpUser };
        if (obj.status === 'success' && obj.data) {
          authenticated = true;
          currentUser = `${obj.data.name} (ID: ${obj.data.id})`;
        }
      }

      const info: WpSystemInfo = {
        siteUrl: config.wpUrl,
        restNamespace: 'wp/v2',
        serverName: config.serverName,
        serverVersion: config.serverVersion,
        authenticated,
        currentUser,
      };

      return createCustomResponse({
        status: 'success',
        data: info,
      });
    }
  );
}