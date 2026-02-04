# flarectl

A terminal user interface client for Cloudflare built with React OpenTUI.

## Features

- Dashboard overview with quick stats
- DNS record management
- Workers deployment and management
- Pages project management
- R2 object storage
- KV namespaces
- D1 databases
- Analytics dashboard
- Firewall rules
- WAF configuration
- SSL/TLS management
- Domain registration
- Stream video delivery
- Images optimization
- Cache management

## Requirements

- Bun >= 1.0
- A terminal with 256-color support
- Chromium browser (auto-installed by Playwright on first run)

## Installation

```bash
bun install
bunx playwright install chromium  # Install browser for authentication
```

## Authentication

flarectl uses **browser-based authentication** to securely log in to your Cloudflare account without needing API tokens or OAuth.

### First-Time Setup

On first run, flarectl will:

1. **Open your browser** to https://dash.cloudflare.com
2. **You log in** using your normal method (email/password, SSO, 2FA, etc.)
3. **flarectl extracts** your authenticated session automatically
4. **Validates** the session with Cloudflare API
5. **Saves** credentials securely in `~/.flarectl/credentials.json` (chmod 600)

No API token creation needed! Just log in normally in your browser.

### How It Works

flarectl uses Playwright to:
- Launch a visible browser window
- Wait for you to complete login (supports all Cloudflare auth methods)
- Capture session cookies and headers after successful authentication
- Validate the extracted credentials work with Cloudflare API
- Store them securely for future use

Your credentials never leave your machine and are stored with strict file permissions.

### Environment Variables (Optional)

You can also authenticate using environment variables (useful for CI/CD):

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_EMAIL="your@email.com"
```

### Multi-Account Support

flarectl supports multiple Cloudflare accounts:

- Press `Ctrl+A` to open the account switcher
- Select an account to switch
- Press `a` or select "Add New Account" to add another account (opens browser login)
- Press `d` to delete the selected account

Each account is authenticated separately via browser login, allowing you to manage multiple Cloudflare accounts seamlessly.

## Usage

```bash
# Development mode with hot reload
bun dev

# Production run
bun start
```

## Keybindings

| Key | Action |
|-----|--------|
| `↑` / `k` | Navigate up |
| `↓` / `j` | Navigate down |
| `Enter` | Select item |
| `Ctrl+A` | Open account switcher |
| `Ctrl+T` | Toggle theme (dark/light) |
| `q` / `Ctrl+C` | Quit |

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Content.tsx
│   │   └── Layout.tsx
│   └── Navigation.tsx
├── lib/
│   ├── router.tsx
│   └── theme-context.tsx
├── routes/
│   ├── Dashboard.tsx
│   ├── DNS.tsx
│   ├── Workers.tsx
│   └── ... (other route components)
├── types/
│   └── index.ts
├── theme.ts
└── index.tsx
```

## Theme

Uses Cloudflare's brand colors:
- Primary: `#F38020` (Cloudflare orange)
- Supports dark and light modes

## Architecture

The app uses a component-based architecture with:
- **Router**: Simple route-based navigation using React context
- **Theme**: Centralized theme management with dark/light mode support
- **Layout**: Reusable layout components (Header, Sidebar, Content)
- **Routes**: Feature-specific route components that plug into the base layout

## Development

To add a new feature route:

1. Create a new component in `src/routes/YourFeature.tsx`
2. Export it from `src/routes/index.ts`
3. Add the route ID to `src/types/index.ts`
4. Add navigation entry in `src/types/index.ts` ROUTES array
5. Add Route component in `src/index.tsx`

## License

MIT
