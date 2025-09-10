import { useState } from "react";
import Sidebar from "../nav/Sidebar";
import Topbar from "../nav/Topbar";

type Props = { children: React.ReactNode };

export default function AppShell({ children }: Props) {
  const [open, setOpen] = useState(false); // mobile sidebar

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile off-canvas backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/10 backdrop-blur-sm z-30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed z-40 top-0 left-0 h-full w-72 border-r bg-card text-card-foreground transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:relative lg:z-auto lg:flex lg:flex-col"
        ].join(" ")}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
