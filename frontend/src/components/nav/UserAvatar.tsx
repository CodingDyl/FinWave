import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";

export default function UserAvatar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = () => {
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return "User";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="User menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name || "User"}
            className="w-8 h-8 rounded-full border-2 border-border"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium border-2 border-border';
                fallback.textContent = getInitials(user.name);
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium border-2 border-border">
            {getInitials(user.name)}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">
                {getDisplayName()}
              </p>
              {user.email && (
                <p className="text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/settings");
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/settings");
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              
              <div className="border-t border-border my-1" />
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
