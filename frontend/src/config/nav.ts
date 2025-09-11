import { CreditCard, LayoutDashboard, Settings, Users } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Payouts", to: "/payouts", icon: CreditCard },
  { label: "Beneficiaries", to: "/beneficiaries", icon: Users },
  { label: "Settings", to: "/settings", icon: Settings },
];
