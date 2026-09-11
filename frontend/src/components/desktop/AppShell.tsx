import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  status: string;
  onReset: () => void;
  children: ReactNode;
};

export function AppShell({ title, subtitle, status, onReset, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand">
          <span className="app-brand-mark">{title}</span>
          <span className="app-brand-sub">{subtitle}</span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Start over
        </button>
      </header>
      <div className="app-body">{children}</div>
      <footer className="app-statusbar">
        <span>{status}</span>
      </footer>
    </div>
  );
}
