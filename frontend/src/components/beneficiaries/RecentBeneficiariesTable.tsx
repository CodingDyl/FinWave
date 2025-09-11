import { useState, useEffect } from "react";
import { UserPlus, Building2, User } from "lucide-react";
import { listBeneficiaries } from "../../lib/api";
import type { Beneficiary } from "../../types/index";

interface RecentBeneficiariesTableProps {
  limit?: number;
  showHeader?: boolean;
}

export default function RecentBeneficiariesTable({ 
  limit = 5, 
  showHeader = true 
}: RecentBeneficiariesTableProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBeneficiaries = async () => {
      setLoading(true);
      try {
        console.log("Loading recent beneficiaries...");
        const data = await listBeneficiaries();
        // Sort by creation date (newest first) and limit
        const sorted = data
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, limit);
        console.log("Recent beneficiaries loaded successfully:", sorted);
        setBeneficiaries(sorted);
      } catch (error) {
        console.error("Failed to load recent beneficiaries:", error);
        // Don't show toast for dashboard component to avoid spam
      } finally {
        setLoading(false);
      }
    };

    loadBeneficiaries();
  }, [limit]);

  const getTypeIcon = (type: string) => {
    return type === "business" ? (
      <Building2 className="size-4 text-primary" />
    ) : (
      <User className="size-4 text-primary" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Recent Beneficiaries</h3>
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border animate-pulse">
              <div className="size-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Beneficiaries</h3>
          <span className="text-sm text-muted-foreground">
            {beneficiaries.length} of {beneficiaries.length}
          </span>
        </div>
      )}
      
      <div className="space-y-3">
        {beneficiaries.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="size-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No beneficiaries yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first beneficiary to get started
            </p>
          </div>
        ) : (
          beneficiaries.map((beneficiary) => (
            <div
              key={beneficiary.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {getTypeIcon(beneficiary.type)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {beneficiary.name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {beneficiary.type}
                    {beneficiary.country && ` • ${beneficiary.country}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {beneficiary.created_at ? formatDate(beneficiary.created_at) : "Recently added"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
