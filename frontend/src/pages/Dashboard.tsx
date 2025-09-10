import { useState, useEffect } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  ArrowUpRight,
  Activity,
  Users,
  CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";

interface PayoutStats {
  totalPayouts: number;
  totalAmount: number;
  pendingPayouts: number;
  successfulPayouts: number;
  failedPayouts: number;
  averageAmount: number;
}

interface RecentPayout {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  destination: {
    type: "bank_account" | "mobile_money";
    last4: string;
  };
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PayoutStats>({
    totalPayouts: 0,
    totalAmount: 0,
    pendingPayouts: 0,
    successfulPayouts: 0,
    failedPayouts: 0,
    averageAmount: 0
  });
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API calls - replace with actual API calls
    const fetchDashboardData = async () => {
      try {
        // Mock data for now - replace with actual API calls
        setStats({
          totalPayouts: 24,
          totalAmount: 125000, // in cents
          pendingPayouts: 3,
          successfulPayouts: 20,
          failedPayouts: 1,
          averageAmount: 5208
        });

        setRecentPayouts([
          {
            id: "po_001",
            amount: 5000,
            currency: "ZAR",
            status: "succeeded",
            destination: { type: "bank_account", last4: "1234" },
            created_at: "2025-01-10T10:30:00Z"
          },
          {
            id: "po_002",
            amount: 2500,
            currency: "ZAR",
            status: "pending",
            destination: { type: "mobile_money", last4: "5678" },
            created_at: "2025-01-10T09:15:00Z"
          },
          {
            id: "po_003",
            amount: 10000,
            currency: "ZAR",
            status: "processing",
            destination: { type: "bank_account", last4: "9012" },
            created_at: "2025-01-09T16:45:00Z"
          }
        ]);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency;
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle className="size-4 text-success" />;
      case "pending":
        return <Clock className="size-4 text-warning" />;
      case "processing":
        return <Activity className="size-4 text-primary" />;
      case "failed":
        return <XCircle className="size-4 text-destructive" />;
      default:
        return <AlertCircle className="size-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "text-success";
      case "pending":
        return "text-warning";
      case "processing":
        return "text-primary";
      case "failed":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your payout overview.
          </p>
        </div>
        <Link
          to="/payouts"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="size-4" />
          New Payout
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Payouts */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Payouts</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalPayouts}</p>
            </div>
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="size-6 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-success">
            <ArrowUpRight className="size-4" />
            <span>+12% from last month</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalAmount, "ZAR")}
              </p>
            </div>
            <div className="size-12 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="size-6 text-success" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-success">
            <ArrowUpRight className="size-4" />
            <span>+8.2% from last month</span>
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingPayouts}</p>
            </div>
            <div className="size-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="size-6 text-warning" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
            <span>Awaiting processing</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((stats.successfulPayouts / stats.totalPayouts) * 100)}%
              </p>
            </div>
            <div className="size-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="size-6 text-success" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-success">
            <ArrowUpRight className="size-4" />
            <span>+2.1% from last month</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Payouts */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Payouts</h2>
              <Link
                to="/payouts"
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentPayouts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="size-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payouts yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first payout to get started
                  </p>
                </div>
              ) : (
                recentPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(payout.status)}
                      <div>
                        <p className="font-medium text-foreground">
                          {formatCurrency(payout.amount, payout.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payout.destination.type === "bank_account" ? "Bank Account" : "Mobile Money"} ••••{payout.destination.last4}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getStatusColor(payout.status)}`}>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/payouts"
                className="w-full btn btn-primary flex items-center gap-2"
              >
                <Plus className="size-4" />
                Create Payout
              </Link>
              <Link
                to="/payouts"
                className="w-full btn btn-outline flex items-center gap-2"
              >
                <Activity className="size-4" />
                View All Payouts
              </Link>
            </div>
          </div>

          {/* Account Summary */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Account Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">User ID</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {user?.user_id || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Avg. Payout</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(stats.averageAmount, "ZAR")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Successful</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {stats.successfulPayouts}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
  