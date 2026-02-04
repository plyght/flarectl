import type { ReactNode } from "react";
import { useTheme } from "../../lib/theme-context.tsx";
import { Header } from "./Header.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { Content } from "./Content.tsx";
import { Navigation } from "../Navigation.tsx";

interface LayoutProps {
  title?: string;
  children?: ReactNode;
  headerChildren?: ReactNode;
}

export function Layout({ title, children, headerChildren }: LayoutProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      backgroundColor={colors.background}
    >
      <Header title={title}>{headerChildren}</Header>
      <box flexGrow={1} flexDirection="row">
        <Sidebar>
          <Navigation />
        </Sidebar>
        <Content>{children}</Content>
      </box>
    </box>
  );
}
