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
  CreditCard,
  UserPlus,
  Building2,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import CreateBeneficiaryModal from "../components/beneficiaries/CreateBeneficiaryModal";
import RecentBeneficiariesTable from "../components/beneficiaries/RecentBeneficiariesTable";
import { 
  listPayouts, 
  listBeneficiaries, 
  listConnectedAccounts, 
  getUserProfile 
} from "../lib/api";
import { useToast } from "../components/toast/ToastProvider";
import type { Beneficiary, Payout, ConnectedAccount, UserProfile } from "../types/index";

interface PayoutStats {
  totalPayouts: number;
  totalAmount: number;
  pendingPayouts: number;
  successfulPayouts: number;
  failedPayouts: number;
  averageAmount: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [stats, setStats] = useState<PayoutStats>({
    totalPayouts: 0,
    totalAmount: 0,
    pendingPayouts: 0,
    successfulPayouts: 0,
    failedPayouts: 0,
    averageAmount: 0
  });
  const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateBeneficiary, setShowCreateBeneficiary] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency;
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="size-4 text-success" />;
      case "pending":
        return <Clock className="size-4 text-warning" />;
      case "processing":
        return <Activity className="size-4 text-primary" />;
      case "failed":
        return <XCircle className="size-4 text-destructive" />;
      case "canceled":
        return <XCircle className="size-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="size-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-success";
      case "pending":
        return "text-warning";
      case "processing":
        return "text-primary";
      case "failed":
        return "text-destructive";
      case "canceled":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [payoutsResponse, beneficiariesData, connectedAccountsData, userProfileData] = await Promise.allSettled([
        listPayouts(),
        listBeneficiaries(),
        listConnectedAccounts(),
        getUserProfile()
      ]);

      // Process payouts data
      if (payoutsResponse.status === 'fulfilled') {
        const payouts = payoutsResponse.value.items || [];
        setRecentPayouts(payouts.slice(0, 5)); // Show only recent 5
        
        // Calculate stats from real data
        const totalPayouts = payouts.length;
        const totalAmount = payouts.reduce((sum, payout) => sum + payout.amount, 0);
        const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
        const successfulPayouts = payouts.filter(p => p.status === 'paid').length;
        const failedPayouts = payouts.filter(p => p.status === 'failed').length;
        const averageAmount = totalPayouts > 0 ? Math.round(totalAmount / totalPayouts) : 0;

        setStats({
          totalPayouts,
          totalAmount,
          pendingPayouts,
          successfulPayouts,
          failedPayouts,
          averageAmount
        });
      }

      // Process beneficiaries data
      if (beneficiariesData.status === 'fulfilled') {
        setBeneficiaries(beneficiariesData.value);
      }

      // Process connected accounts data
      if (connectedAccountsData.status === 'fulfilled') {
        setConnectedAccounts(connectedAccountsData.value);
      }

      // Process user profile data
      if (userProfileData.status === 'fulfilled') {
        setUserProfile(userProfileData.value);
      }

    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);
      toast.error({
        title: "Error",
        description: "Failed to refresh dashboard data."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBeneficiaryCreated = (beneficiary: Beneficiary) => {
    console.log("Beneficiary created:", beneficiary);
    // Refresh data to show the new beneficiary
    refreshData();
    toast.success({
      title: "Beneficiary Created",
      description: `${beneficiary.name} has been added successfully.`
    });
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
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            disabled={loading}
            className="btn btn-ghost flex items-center gap-2"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateBeneficiary(true)}
            className="btn btn-outline flex items-center gap-2"
          >
            <UserPlus className="size-4" />
            Add Beneficiary
          </button>
          <Link
            to="/payouts"
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="size-4" />
            New Payout
          </Link>
        </div>
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
                          {payout.beneficiary.name} • {payout.destination.type === "bank_account" ? "Bank Account" : "Card"} ••••{payout.destination.last4}
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
          {/* Recent Beneficiaries */}
          <RecentBeneficiariesTable limit={3} />

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowCreateBeneficiary(true)}
                className="w-full btn btn-outline flex items-center gap-2"
              >
                <UserPlus className="size-4" />
                Add Beneficiary
              </button>
              <Link
                to="/payouts"
                className="w-full btn btn-primary flex items-center gap-2"
              >
                <Plus className="size-4" />
                Create Payout
              </Link>
              <Link
                to="/beneficiaries"
                className="w-full btn btn-ghost flex items-center gap-2"
              >
                <Users className="size-4" />
                View All Beneficiaries
              </Link>
              <Link
                to="/connected-accounts"
                className="w-full btn btn-ghost flex items-center gap-2"
              >
                <Building2 className="size-4" />
                Connect Bank Account
              </Link>
              <Link
                to="/payouts"
                className="w-full btn btn-ghost flex items-center gap-2"
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
                  {userProfile?.user_id || user?.user_id || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Beneficiaries</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {beneficiaries.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Connected Accounts</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {connectedAccounts.length}
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

      {/* Create Beneficiary Modal */}
      <CreateBeneficiaryModal
        open={showCreateBeneficiary}
        onClose={() => setShowCreateBeneficiary(false)}
        onCreated={handleBeneficiaryCreated}
      />
    </div>
  );
}
  