import type { ReactNode } from "react";
import { useTheme } from "../lib/theme";
import AppNav from "./AppNav";

/** Themeable wrapper for the inner app screens. Renders the nav and applies data-theme. */
export default function AppShell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="app-shell" data-theme={theme}>
      <AppNav />
      {children}
    </div>
  );
}
