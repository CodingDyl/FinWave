import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../config/nav";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 h-16 px-4 border-b">
        <div className="size-8 rounded-[var(--radius)] bg-primary" />
        <div className="font-semibold">Finwave</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 border",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent border-transparent",
                  ].join(" ")
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="text-sm font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer (optional) */}
      <div className="border-t p-3 text-xs text-muted-foreground">
        v0.1.0
      </div>
    </div>
  );
}
