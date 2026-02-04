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

## Installation

```bash
bun install
```

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
