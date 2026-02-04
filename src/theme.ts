export type Color = string

export const CloudflareColors = {
  orange: {
    primary: "#F38020",
    light: "#FFA552",
    dark: "#C86414",
  },
  gray: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#E5E5E5",
    300: "#D4D4D4",
    400: "#A3A3A3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
  },
  semantic: {
    success: "#22C55E",
    warning: "#EAB308",
    error: "#EF4444",
    info: "#3B82F6",
  },
} as const

export type ThemeMode = "dark" | "light";

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: Color;
    primaryLight: Color;
    primaryDark: Color;
    background: Color;
    backgroundAlt: Color;
    surface: Color;
    surfaceAlt: Color;
    border: Color;
    borderLight: Color;
    text: Color;
    textMuted: Color;
    textInverse: Color;
    success: Color;
    warning: Color;
    error: Color;
    info: Color;
  };
}

export function createTheme(mode: ThemeMode): Theme {
  const isDark = mode === "dark";

  return {
    mode,
    colors: {
      primary: CloudflareColors.orange.primary,
      primaryLight: CloudflareColors.orange.light,
      primaryDark: CloudflareColors.orange.dark,
      background: isDark ? CloudflareColors.gray[900] : CloudflareColors.gray[50],
      backgroundAlt: isDark ? CloudflareColors.gray[800] : CloudflareColors.gray[100],
      surface: isDark ? CloudflareColors.gray[800] : "#FFFFFF",
      surfaceAlt: isDark ? CloudflareColors.gray[700] : CloudflareColors.gray[200],
      border: isDark ? CloudflareColors.gray[600] : CloudflareColors.gray[300],
      borderLight: isDark ? CloudflareColors.gray[700] : CloudflareColors.gray[200],
      text: isDark ? CloudflareColors.gray[100] : CloudflareColors.gray[900],
      textMuted: isDark ? CloudflareColors.gray[400] : CloudflareColors.gray[500],
      textInverse: isDark ? CloudflareColors.gray[900] : CloudflareColors.gray[100],
      success: CloudflareColors.semantic.success,
      warning: CloudflareColors.semantic.warning,
      error: CloudflareColors.semantic.error,
      info: CloudflareColors.semantic.info,
    },
  };
}

export const darkTheme = createTheme("dark");
export const lightTheme = createTheme("light");
