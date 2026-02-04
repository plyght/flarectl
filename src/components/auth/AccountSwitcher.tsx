import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context.tsx";
import { useTheme } from "../../lib/theme-context.tsx";

interface Props {
  onClose: () => void;
}

export function AccountSwitcher({ onClose }: Props) {
  const { accounts, currentAccount, switchAccount, removeAccount, loginWithToken } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"list" | "add">("list");
  const [newToken, setNewToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const items = [
    ...accounts,
    { email: "+ Add Account", accountName: "", accountId: "", apiToken: "", createdAt: "" },
  ];

  useKeyboard((key) => {
    if (mode === "add") {
      if (key.name === "escape") {
        setMode("list");
        setNewToken("");
        setError("");
      } else if (key.name === "return" && newToken.trim() && !isLoading) {
        handleAddAccount();
      }
      return;
    }

    if (key.name === "escape" || key.name === "q") {
      onClose();
    } else if (key.name === "j" || key.name === "down") {
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (key.name === "k" || key.name === "up") {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (key.name === "return") {
      const selected = items[selectedIndex];
      if (selected && selected.email === "+ Add Account") {
        setMode("add");
      } else if (selected) {
        switchAccount(selected.email);
        onClose();
      }
    } else if (key.name === "d" && selectedIndex < accounts.length) {
      const selected = items[selectedIndex];
      if (selected) {
        removeAccount(selected.email);
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
    }
  });

  const handleAddAccount = async () => {
    setIsLoading(true);
    setError("");

    try {
      await loginWithToken(newToken.trim());
      setMode("list");
      setNewToken("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add account");
      setIsLoading(false);
    }
  };

  if (mode === "add") {
    return (
      <box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        alignItems="center"
        justifyContent="center"
      >
        <box
          flexDirection="column"
          gap={1}
          padding={2}
          borderStyle="single"
          borderColor={colors.border}
          backgroundColor={colors.surface}
          width={60}
        >
          <text>
            <strong fg={colors.primary}>Add Cloudflare Account</strong>
          </text>

          <box marginTop={1}>
            <text>
              <span fg={colors.textMuted}>Paste your Cloudflare API token:</span>
            </text>
          </box>

          <box marginTop={1}>
            <input
              value={newToken}
              onInput={(val) => setNewToken(val)}
              placeholder="API token..."
            />
          </box>

          {error && (
            <box marginTop={1}>
              <text>
                <span fg={colors.error}>{error}</span>
              </text>
            </box>
          )}

          <box marginTop={1}>
            <text>
              <span fg={colors.textMuted}>
                Press <strong fg={colors.primary}>Enter</strong> to add •{" "}
                <strong fg={colors.primary}>Esc</strong> to cancel
              </span>
            </text>
          </box>

          {isLoading && (
            <text>
              <span fg={colors.primary}>⟳ Adding account...</span>
            </text>
          )}
        </box>
      </box>
    );
  }

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      alignItems="center"
      justifyContent="center"
    >
      <box
        flexDirection="column"
        gap={1}
        padding={2}
        borderStyle="single"
        borderColor={colors.border}
        backgroundColor={colors.surface}
        width={60}
      >
        <text>
          <strong fg={colors.primary}>Cloudflare Accounts</strong>
        </text>

        <box marginTop={1} flexDirection="column">
          {items.map((account, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = account.email === currentAccount?.email;

            return (
              <box key={account.email} gap={1}>
                <text>
                  <span fg={isSelected ? colors.primary : colors.text}>
                    {isSelected ? "▸ " : "  "}
                    {isCurrent && "● "}
                    {account.email}
                  </span>
                </text>
                {account.accountName && (
                  <text>
                    <span fg={colors.textMuted}> ({account.accountName})</span>
                  </text>
                )}
              </box>
            );
          })}
        </box>

        <box marginTop={1}>
          <text>
            <span fg={colors.textMuted}>
              <strong fg={colors.primary}>↑↓/jk</strong> Navigate •{" "}
              <strong fg={colors.primary}>Enter</strong> Select •{" "}
              <strong fg={colors.primary}>d</strong> Delete •{" "}
              <strong fg={colors.primary}>Esc</strong> Close
            </span>
          </text>
        </box>
      </box>
    </box>
  );
}
