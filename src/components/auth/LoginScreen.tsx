import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context.tsx";
import { useTheme } from "../../lib/theme-context.tsx";

export function LoginScreen() {
  const { loginWithToken } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useKeyboard((key) => {
    if (key.name === "return" && token.trim() && !isLoading) {
      handleLogin();
    }
  });

  const handleLogin = async () => {
    if (!token.trim()) {
      setError("Please enter an API token");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await loginWithToken(token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
      setIsLoading(false);
    }
  };

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <box
        flexDirection="column"
        gap={1}
        padding={2}
        borderStyle="single"
        borderColor={colors.border}
        width={70}
      >
        <text>
          <strong fg={colors.primary}>Welcome to flarectl</strong>
        </text>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>
              Manage your Cloudflare infrastructure from the terminal
            </span>
          </text>
        </box>

        <box marginTop={2} flexDirection="column" gap={1}>
          <text>
            <strong fg={colors.text}>Get your API Token:</strong>
          </text>
          <text>
            <span fg={colors.textMuted}>
              1. Visit: https://dash.cloudflare.com/profile/api-tokens
            </span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              2. Click "Create Token" → Use "Edit zone DNS" template
            </span>
          </text>
          <text>
            <span fg={colors.textMuted}>
              3. Or create a custom token with the permissions you need
            </span>
          </text>
          <text>
            <span fg={colors.textMuted}>4. Copy the token and paste it below</span>
          </text>
        </box>

        <box marginTop={2} flexDirection="column" gap={1}>
          <text>
            <strong fg={colors.text}>API Token:</strong>
          </text>
          <input
            value={token}
            onInput={(val) => setToken(val)}
            placeholder="Paste your Cloudflare API token here..."
          />
        </box>

        {error && (
          <box marginTop={1}>
            <text>
              <span fg={colors.error}>{error}</span>
            </text>
          </box>
        )}

        <box marginTop={2} flexDirection="column" gap={1}>
          <text>
            <span fg={colors.textMuted}>
              Press <strong fg={colors.primary}>Enter</strong> to continue
            </span>
          </text>
          {isLoading && (
            <text>
              <span fg={colors.primary}>⟳ Validating token...</span>
            </text>
          )}
        </box>
      </box>
    </box>
  );
}
