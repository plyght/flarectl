# flarectl

Terminal interface for managing Cloudflare infrastructure with browser-based OAuth authentication and real-time resource monitoring.

## Overview

flarectl provides a comprehensive TUI for interacting with Cloudflare's API, enabling developers and infrastructure teams to manage domains, DNS, Workers, storage, security, and media services directly from the terminal. Built with React and OpenTUI, it combines the efficiency of CLI workflows with the clarity of a structured interface.

## Features

- **Browser-Based Authentication**: OAuth flow with automatic token management and secure credential storage
- **Multi-Account Support**: Switch between multiple Cloudflare accounts with Ctrl+A
- **Comprehensive Resource Management**: DNS records, Workers, Pages, R2, KV, D1, Analytics, Firewall, WAF, SSL/TLS, Domains, Stream, Images, Cache
- **Real-Time Monitoring**: Live dashboard with analytics, traffic patterns, and security insights
- **Keyboard-First Navigation**: Vim-style shortcuts and intuitive hotkeys
- **Theme Support**: Dark and light themes with Ctrl+T toggle
- **Secure Storage**: Credentials stored in `~/.flarectl/credentials.json` with 0600 permissions

## Installation

```bash
# From source
git clone https://github.com/yourusername/flarectl.git
cd flarectl
bun install
bun run src/index.tsx

# Using Bun (recommended)
bun install -g flarectl

# Make executable
chmod +x src/index.tsx
```

## Usage

```bash
# Start the TUI
flarectl

# Using environment variables (bypasses OAuth)
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
flarectl
```

### Keyboard Shortcuts

- `Ctrl+A` - Account switcher
- `Ctrl+T` - Toggle theme
- `Ctrl+C` / `q` - Quit
- `↑↓` / `j/k` - Navigate
- `Enter` - Select/confirm

### Navigation

The TUI provides dedicated views for each Cloudflare service:

- **Dashboard** - Overview with analytics and zone summary
- **DNS** - Manage DNS records with inline editing
- **Workers** - Deploy and monitor Cloudflare Workers
- **Pages** - Manage Pages deployments
- **R2** - Object storage bucket management
- **KV** - Key-Value namespace operations
- **D1** - SQLite database management
- **Analytics** - Traffic, performance, and security metrics
- **Firewall** - IP access rules and rate limiting
- **WAF** - Web Application Firewall configuration
- **SSL/TLS** - Certificate management
- **Domains** - Domain registration and transfers
- **Stream** - Video streaming and management
- **Images** - Image optimization and variants
- **Cache** - Cache purging and configuration

## Configuration

flarectl stores credentials in `~/.flarectl/credentials.json`:

```json
{
  "current": "user@example.com",
  "accounts": [
    {
      "email": "user@example.com",
      "accountId": "abc123...",
      "accountName": "Production",
      "apiToken": "token...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

Alternatively, use environment variables:

- `CLOUDFLARE_API_TOKEN` - API token (bypasses OAuth)
- `CLOUDFLARE_EMAIL` - Account email (optional)
- `CLOUDFLARE_ACCOUNT_ID` - Account ID (optional)

## Architecture

- `src/index.tsx` - Application entry point and routing
- `src/lib/auth.ts` - Credential management and token validation
- `src/lib/cloudflare.ts` - Cloudflare API client with typed endpoints
- `src/lib/analytics-api.ts` - Analytics GraphQL integration
- `src/lib/security.ts` - Security-related API calls (firewall, WAF)
- `src/routes/` - View components for each service
- `src/components/` - Reusable UI components (layout, auth)
- `src/types/` - TypeScript definitions for API responses

The application uses OpenTUI's React reconciler for terminal rendering with full React hooks support and declarative layout primitives.

## Development

```bash
bun install
bun run dev        # Watch mode with hot reload
bun run typecheck  # Type checking
bun run lint       # Linting
bun run format     # Code formatting
bun test           # Run tests
```

Requires Bun 1.0+. Key dependencies: `@opentui/core`, `@opentui/react`, `react`.

## License

MIT License
