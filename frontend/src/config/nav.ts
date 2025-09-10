import { CreditCard, LayoutDashboard, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Payouts", to: "/payouts", icon: CreditCard },
  { label: "Settings", to: "/settings", icon: Settings },
];
