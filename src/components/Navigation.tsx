import { useState } from "react";
import { useTheme } from "../lib/theme-context.tsx";
import { useRouter } from "../lib/router.tsx";
import { ROUTES } from "../types/index.ts";
import { useKeyboard } from "@opentui/react";

export function Navigation() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { currentRoute, navigate } = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(() =>
    ROUTES.findIndex((r) => r.id === currentRoute)
  );

  useKeyboard((key) => {
    if (key.name === "up" || key.name === "k") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "down" || key.name === "j") {
      setSelectedIndex((prev) => Math.min(ROUTES.length - 1, prev + 1));
    } else if (key.name === "return" || key.name === "space") {
      const route = ROUTES[selectedIndex];
      if (route) {
        navigate(route.id);
      }
    }
  });

  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      {ROUTES.map((route, index) => {
        const isSelected = index === selectedIndex;
        const isActive = route.id === currentRoute;

        return (
          <box
            key={route.id}
            flexDirection="row"
            gap={1}
            backgroundColor={isSelected ? colors.surfaceAlt : undefined}
            paddingLeft={1}
            paddingRight={1}
          >
            <text>
              <span fg={isActive ? colors.primary : colors.textMuted}>
                {route.icon}
              </span>
            </text>
            <text>
              <span fg={isActive ? colors.primary : isSelected ? colors.text : colors.textMuted}>
                {route.label}
              </span>
            </text>
            {isActive && (
              <text>
                <span fg={colors.primary}>◀</span>
              </text>
            )}
          </box>
        );
      })}
    </box>
  );
}
