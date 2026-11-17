/**
 * Cấu hình môi trường cho WordPress MCP Server
 */
export interface AppConfig {
  readonly wpUrl: string;
  readonly wpUsername: string;
  readonly wpAppPassword: string;
  readonly serverName: string;
  readonly serverVersion: string;
}

export const config: AppConfig = {
  wpUrl: process.env.WP_URL || process.env.WORDPRESS_URL || 'https://example.com',
  wpUsername: process.env.WP_USERNAME || process.env.WORDPRESS_USERNAME || '',
  wpAppPassword: process.env.WP_APP_PASSWORD || process.env.WORDPRESS_APP_PASSWORD || '',
  serverName: 'wordpress-mcp-nodejs',
  serverVersion: '1.2.0',
};
