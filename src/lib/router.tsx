import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { RouteId } from "../types/index.ts";

interface RouterContextValue {
  currentRoute: RouteId;
  navigate: (route: RouteId) => void;
  params: Record<string, string>;
  setParams: (params: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

interface RouterProviderProps {
  children: ReactNode;
  initialRoute?: RouteId;
}

export function RouterProvider({ children, initialRoute = "dashboard" }: RouterProviderProps) {
  const [currentRoute, setCurrentRoute] = useState<RouteId>(initialRoute);
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = useCallback((route: RouteId) => {
    setCurrentRoute(route);
    setParams({});
  }, []);

  const value: RouterContextValue = {
    currentRoute,
    navigate,
    params,
    setParams,
  };

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}

interface RouteProps {
  route: RouteId;
  children: ReactNode;
}

export function Route({ route, children }: RouteProps) {
  const { currentRoute } = useRouter();
  if (currentRoute !== route) {
    return null;
  }
  return <>{children}</>;
}

interface RoutesProps {
  children: ReactNode;
}

export function Routes({ children }: RoutesProps) {
  return <>{children}</>;
}
