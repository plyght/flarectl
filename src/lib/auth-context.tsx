import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import {
  type CloudflareAccount,
  addAccount,
  addApiTokenAccount,
  getCurrentAccount,
  loadCredentials,
  removeAccount as removeAccountFn,
  switchAccount as switchAccountFn,
} from "./auth.ts";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentAccount: CloudflareAccount | null;
  accounts: CloudflareAccount[];
  loginWithToken: (token: string) => Promise<void>;
  switchAccount: (email: string) => Promise<void>;
  removeAccount: (email: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentAccount, setCurrentAccount] = useState<CloudflareAccount | null>(null);
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const store = await loadCredentials();
      const current = await getCurrentAccount();
      setAccounts(store.accounts);
      setCurrentAccount(current);
    } catch {
      setAccounts([]);
      setCurrentAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const loginWithToken = async (token: string) => {
    const account = await addApiTokenAccount(token);
    await addAccount(account);
    await refresh();
  };

  const switchAccountHandler = async (email: string) => {
    await switchAccountFn(email);
    await refresh();
  };

  const removeAccountHandler = async (email: string) => {
    await removeAccountFn(email);
    await refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: accounts.length > 0,
        isLoading,
        currentAccount,
        accounts,
        loginWithToken,
        switchAccount: switchAccountHandler,
        removeAccount: removeAccountHandler,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useIsAuthenticated(): boolean {
  return useAuth().isAuthenticated;
}

export function useCurrentAccount(): CloudflareAccount | null {
  return useAuth().currentAccount;
}
