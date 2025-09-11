import { Menu } from "lucide-react";
import ThemeToggle from "../../components/theme/ThemeToggle";
import UserAvatar from "./UserAvatar";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-16 px-4 lg:px-6 flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          className="lg:hidden btn h-9 px-3 border"
          onClick={onMenu}
          aria-label="Open sidebar"
        >
          <Menu className="size-4" />
        </button>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
