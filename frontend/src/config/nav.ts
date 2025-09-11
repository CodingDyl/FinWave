import { CreditCard, LayoutDashboard, Settings, Users, Building2 } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Payouts", to: "/payouts", icon: CreditCard },
  { label: "Beneficiaries", to: "/beneficiaries", icon: Users },
  { label: "Connected Accounts", to: "/connected-accounts", icon: Building2 },
  { label: "Settings", to: "/settings", icon: Settings },
];
