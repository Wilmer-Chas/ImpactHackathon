import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand">
          <span className="app-brand-mark">Impact</span>
          <span className="app-brand-sub">Management Oversight</span>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
