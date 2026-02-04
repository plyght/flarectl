# Authentication System

flarectl implements a browser-based authentication system that captures an authenticated Cloudflare dashboard session to deliver an OAuth-style login experience.

## Overview

Cloudflare does not provide OAuth for client apps. flarectl opens a real browser to https://dash.cloudflare.com, waits for you to sign in, extracts the authenticated session tokens, validates them against the Cloudflare API, and stores them locally for future use.

## Features

### 1. **Secure Session Storage**
- Session cookies and auth headers stored in `~/.flarectl/credentials.json`
- File permissions automatically set to `600` (owner read/write only)
- Passwords are never stored or logged

### 2. **Multi-Account Support**
- Manage multiple Cloudflare accounts
- Easy switching between accounts with `Ctrl+A`
- Each account stores:
  - Email address
  - Account ID
  - Account name
  - Session auth headers and cookies
  - Creation timestamp

### 3. **Session Validation**
- Validates captured sessions against Cloudflare API before saving
- Fetches account information automatically
- Clear errors when the session is invalid or expired

### 4. **OAuth-Style UI**
- Login screen with live progress steps
- Account switcher modal to add or remove accounts
- Cloudflare orange theme matching brand colors

### 5. **Environment Variable Backstop**
- Supports environment variable authentication
- Falls back to env vars if set:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_EMAIL`

## Usage

### First Time Setup

1. Run `bun start`
2. flarectl opens a browser to https://dash.cloudflare.com
3. Sign in using your normal method (email/password, SSO, 2FA, etc.)
4. flarectl captures the authenticated session automatically
5. Validates the session with Cloudflare API
6. Saves credentials securely in `~/.flarectl/credentials.json` (chmod 600)

### Managing Multiple Accounts

**Open Account Switcher:** Press `Ctrl+A`

**Navigate:**
- `↑` / `k` - Move up
- `↓` / `j` - Move down

**Actions:**
- `Enter` - Switch to selected account
- `a` - Add new account (opens browser login)
- `d` - Delete selected account
- `Esc` / `q` - Close switcher

### Environment Variables (CI/CD)

For automated environments, set:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_EMAIL="your@email.com"
```

When env vars are set, they take priority and the app won't prompt for browser login.

## Architecture

### Files

```
src/
├── lib/
│   ├── auth.ts              # Core auth functions and session capture
│   └── auth-context.tsx     # React context for auth state
├── components/
│   └── auth/
│       ├── LoginScreen.tsx     # Browser login UI
│       ├── AccountSwitcher.tsx # Account management modal
│       └── index.ts            # Exports
└── index.tsx                # Integration point
```

### Storage Format

`~/.flarectl/credentials.json`:

```json
{
  "current": "user@example.com",
  "accounts": [
    {
      "email": "user@example.com",
      "accountId": "abc123def456",
      "accountName": "My Company",
      "auth": {
        "type": "session",
        "headers": {
          "Authorization": "Bearer dashboard-session-token"
        },
        "cookie": "cf_clearance=...; __cflb=..."
      },
      "createdAt": "2026-02-04T12:00:00.000Z"
    }
  ]
}
```

### API Functions

#### Core Functions

- `loadCredentials()` - Load credentials from file or env vars
- `saveCredentials(store)` - Save credentials with proper permissions
- `loginWithBrowser(options)` - Launch browser login and return account data
- `extractSessionTokens(page)` - Extract cookies, storage, and headers
- `validateExtractedTokens(tokens)` - Validate captured tokens with Cloudflare API
- `addAccount(token)` - Validate and add API token account
- `getCurrentAccount()` - Get currently active account
- `switchAccount(email)` - Switch to different account
- `removeAccount(email)` - Remove account from storage
- `validateToken(token)` - Check if API token is valid
- `getUserInfo(token)` - Fetch user information
- `getAccounts(token)` - Fetch available accounts

#### Compatibility Functions

- `getAuthHeaders()` - Get auth headers for API requests
- `getAccountId()` - Get current account ID
- `isAuthenticated()` - Check if user is authenticated
- `clearCredentials()` - Clear cached credentials

### React Hooks

```typescript
const auth = useAuth()
const isAuthenticated = useIsAuthenticated()
const currentAccount = useCurrentAccount()
```

### Auth Context API

```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  currentAccount: CloudflareAccount | null
  accounts: CloudflareAccount[]
  login: (options?: BrowserLoginOptions) => Promise<void>
  switchAccount: (email: string) => Promise<void>
  removeAccount: (email: string) => Promise<void>
  refresh: () => Promise<void>
}
```

## Security

### Session Storage
- File permissions set to `600` (owner only)
- Session headers and cookies never logged
- Passwords never stored

### Validation
- Sessions validated against Cloudflare API before storage
- Invalid sessions rejected with clear error messages

### Error Handling
- No sensitive information in error messages
- Graceful handling for corrupted credentials files

## Troubleshooting

### "Login timed out" or "Unable to validate session"
1. Make sure the browser window is visible and you completed login
2. Try again and wait for the dashboard to finish loading
3. If Playwright browsers are missing, run `bunx playwright install chromium`

### "Not authenticated" Error
1. Check if `~/.flarectl/credentials.json` exists
2. Check file permissions: `ls -la ~/.flarectl/`
3. Try removing the file and re-adding your account

### Multiple Account Issues
1. Check `current` field in credentials file points to a valid email
2. Remove and re-add the problematic account

### Environment Variables Not Working
1. Verify variables are exported: `echo $CLOUDFLARE_API_TOKEN`
2. Restart your shell/terminal
3. Check variable names are exact (case-sensitive)
