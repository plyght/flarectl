import type { ReactNode } from "react";
import { useTheme } from "../../lib/theme-context.tsx";

interface SidebarProps {
  width?: number;
  children?: ReactNode;
}

export function Sidebar({ width = 20, children }: SidebarProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <box
      width={width}
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.border}
      backgroundColor={colors.backgroundAlt}
      paddingTop={1}
      paddingBottom={1}
    >
      {children}
    </box>
  );
}
