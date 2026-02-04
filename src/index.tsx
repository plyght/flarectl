import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard } from "@opentui/react"
import { useState } from "react"
import { ThemeProvider, useTheme } from "./lib/theme-context.tsx"
import { AuthProvider, useAuth } from "./lib/auth-context.tsx"
import { RouterProvider, Route, Routes } from "./lib/router.tsx"
import { Layout } from "./components/layout/Layout.tsx"
import { LoginScreen } from "./components/auth/LoginScreen.tsx"
import { AccountSwitcher } from "./components/auth/AccountSwitcher.tsx"
import {
  Dashboard,
  DNS,
  Workers,
  Pages,
  R2,
  KV,
  D1,
  Analytics,
  Firewall,
  WAF,
  SSL,
  Domains,
  Stream,
  Images,
  Cache,
} from "./routes/index.ts"

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
})

function MainApp() {
  const { toggleTheme } = useTheme()
  const { isAuthenticated, isLoading } = useAuth()
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false)

  useKeyboard((key) => {
    if (key.name === "t" && key.ctrl) {
      toggleTheme()
    }
    if (key.name === "a" && key.ctrl) {
      if (isAuthenticated) {
        setShowAccountSwitcher((prev) => !prev)
      }
    }
    if (key.name === "q" || (key.name === "c" && key.ctrl)) {
      renderer.destroy()
    }
  })

  if (isLoading) {
    return (
      <box flexDirection="column" width="100%" height="100%" alignItems="center" justifyContent="center">
        <text>
          <span>Loading...</span>
        </text>
      </box>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route route="dashboard">
            <Dashboard />
          </Route>
          <Route route="dns">
            <DNS />
          </Route>
          <Route route="workers">
            <Workers />
          </Route>
          <Route route="pages">
            <Pages />
          </Route>
          <Route route="r2">
            <R2 />
          </Route>
          <Route route="kv">
            <KV />
          </Route>
          <Route route="d1">
            <D1 />
          </Route>
          <Route route="analytics">
            <Analytics />
          </Route>
          <Route route="firewall">
            <Firewall />
          </Route>
          <Route route="waf">
            <WAF />
          </Route>
          <Route route="ssl">
            <SSL />
          </Route>
          <Route route="domains">
            <Domains />
          </Route>
          <Route route="stream">
            <Stream />
          </Route>
          <Route route="images">
            <Images />
          </Route>
          <Route route="cache">
            <Cache />
          </Route>
        </Routes>
      </Layout>
      {showAccountSwitcher && <AccountSwitcher onClose={() => setShowAccountSwitcher(false)} />}
    </>
  )
}

function App() {
  return (
    <ThemeProvider initialMode="dark">
      <AuthProvider>
        <RouterProvider initialRoute="dashboard">
          <MainApp />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

createRoot(renderer).render(<App />)
