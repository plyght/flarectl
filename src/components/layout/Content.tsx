import type { ReactNode } from "react";
import { useTheme } from "../../lib/theme-context.tsx";

interface ContentProps {
  children?: ReactNode;
}

export function Content({ children }: ContentProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.border}
      backgroundColor={colors.background}
      padding={1}
    >
      {children}
    </box>
  );
}
