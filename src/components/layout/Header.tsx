import type { ReactNode } from "react";
import { useTheme } from "../../lib/theme-context.tsx";

interface HeaderProps {
  title?: string;
  children?: ReactNode;
}

export function Header({ title = "flarectl", children }: HeaderProps) {
  const { theme, mode } = useTheme();
  const { colors } = theme;

  return (
    <box
      height={3}
      flexDirection="row"
      borderStyle="single"
      borderColor={colors.border}
      backgroundColor={colors.surface}
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexGrow={1} flexDirection="row" alignItems="center" gap={2}>
        <text>
          <strong fg={colors.primary}>◉</strong>
        </text>
        <text>
          <strong fg={colors.primary}>{title}</strong>
        </text>
        {children}
      </box>
      <box alignItems="center" flexDirection="row" gap={1}>
        <text>
          <span fg={colors.textMuted}>[</span>
        </text>
        <text>
          <span fg={colors.text}>{mode === "dark" ? "◐" : "◑"}</span>
        </text>
        <text>
          <span fg={colors.textMuted}>]</span>
        </text>
      </box>
    </box>
  );
}
