import { useState, useEffect } from "react";
import { X, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Ban } from "lucide-react";
import { useToast } from "../toast/ToastProvider";
import { processPayout, cancelPayout, getPayoutStatus } from "../../lib/api";
import type { Payout } from "../../types/index";

interface PayoutTrackingModalProps {
  open: boolean;
  onClose: () => void;
  payout: Payout | null;
  onPayoutUpdated?: (payout: Payout) => void;
}

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed" | "failed" | "current";
  timestamp?: string;
  details?: string;
}

export default function PayoutTrackingModal({ 
  open, 
  onClose, 
  payout, 
  onPayoutUpdated 
}: PayoutTrackingModalProps) {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [detailedStatus, setDetailedStatus] = useState<any>(null);
  const toast = useToast();

  // Refresh detailed status when modal opens
  useEffect(() => {
    if (open && payout) {
      fetchDetailedStatus();
    }
  }, [open, payout]);

  const fetchDetailedStatus = async () => {
    if (!payout) return;
    
    try {
      const status = await getPayoutStatus(payout.id);
      setDetailedStatus(status);
    } catch (error) {
      console.error("Failed to fetch detailed status:", error);
    }
  };

  const handleProcessPayout = async () => {
    if (!payout) return;
    
    setProcessing(true);
    try {
      const updatedPayout = await processPayout(payout.id);
      onPayoutUpdated?.(updatedPayout);
      toast.success({
        title: "Payout Processing",
        description: "Payout has been submitted to Stripe for processing.",
      });
      await fetchDetailedStatus();
    } catch (error: any) {
      console.error("Failed to process payout:", error);
      toast.error({
        title: "Processing Failed",
        description: error?.message || "Failed to process payout.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPayout = async () => {
    if (!payout) return;
    
    setCancelling(true);
    try {
      const updatedPayout = await cancelPayout(payout.id);
      onPayoutUpdated?.(updatedPayout);
      toast.success({
        title: "Payout Cancelled",
        description: "Payout has been successfully cancelled.",
      });
      await fetchDetailedStatus();
    } catch (error: any) {
      console.error("Failed to cancel payout:", error);
      toast.error({
        title: "Cancellation Failed",
        description: error?.message || "Failed to cancel payout.",
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatMoney = (cents: number, currency: string) => {
    const amount = cents / 100;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing":
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case "paid":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "canceled":
        return <Ban className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionSteps = (): TransactionStep[] => {
    if (!payout) return [];

    const steps: TransactionStep[] = [
      {
        id: "created",
        title: "Payout Created",
        description: "Payout request has been created and is pending processing",
        status: "completed",
        timestamp: payout.created_at,
      },
    ];

    if (payout.status !== "pending") {
      steps.push({
        id: "submitted",
        title: "Submitted to Stripe",
        description: "Payout has been submitted to Stripe for processing",
        status: "completed",
        timestamp: payout.processed_at,
        details: payout.stripe_payout_id ? `Stripe ID: ${payout.stripe_payout_id}` : undefined,
      });
    }

    if (payout.status === "processing") {
      steps.push({
        id: "processing",
        title: "Processing",
        description: "Payout is being processed by Stripe",
        status: "current",
      });
    } else if (payout.status === "paid") {
      steps.push({
        id: "processing",
        title: "Processing",
        description: "Payout was processed by Stripe",
        status: "completed",
      });
      steps.push({
        id: "completed",
        title: "Completed",
        description: "Payout has been successfully completed",
        status: "completed",
        timestamp: payout.processed_at,
        details: payout.arrival_date ? `Arrival: ${new Date(payout.arrival_date).toLocaleString()}` : undefined,
      });
    } else if (payout.status === "failed") {
      steps.push({
        id: "failed",
        title: "Failed",
        description: payout.failure_message || "Payout processing failed",
        status: "failed",
        details: payout.failure_code ? `Error: ${payout.failure_code}` : undefined,
      });
    } else if (payout.status === "canceled") {
      steps.push({
        id: "cancelled",
        title: "Cancelled",
        description: "Payout has been cancelled",
        status: "failed",
        timestamp: payout.processed_at,
      });
    }

    return steps;
  };

  const canProcess = payout?.status === "pending";
  const canCancel = payout?.status === "pending" || payout?.status === "processing";

  if (!payout) return null;

  const steps = getTransactionSteps();

  return (
    <div className={`fixed inset-0 z-50 ${open ? "block" : "hidden"}`}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {getStatusIcon(payout.status)}
              <div>
                <h2 className="text-xl font-semibold">Payout Details</h2>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(payout.amount, payout.currency)} • {payout.beneficiary.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Transaction Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transaction Progress</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {step.status === "completed" && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {step.status === "current" && (
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {step.status === "failed" && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {step.status === "pending" && (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{step.title}</h4>
                        {step.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(step.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      {step.details && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {step.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Beneficiary</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{payout.beneficiary.name}</p>
                  <p className="text-muted-foreground capitalize">
                    {payout.beneficiary.type}
                    {payout.beneficiary.country && ` • ${payout.beneficiary.country}`}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Destination</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{payout.destination.label}</p>
                  <p className="text-muted-foreground">
                    {payout.destination.currency}
                    {payout.destination.last4 && ` • ••••${payout.destination.last4}`}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Amount</h4>
                <p className="text-lg font-semibold">
                  {formatMoney(payout.amount, payout.currency)}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(payout.status)}
                  <span className="capitalize font-medium">{payout.status}</span>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            {payout.memo && (
              <div className="space-y-2">
                <h4 className="font-medium">Memo</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {payout.memo}
                </p>
              </div>
            )}

            {/* Stripe Details */}
            {detailedStatus?.stripe_status && (
              <div className="space-y-2">
                <h4 className="font-medium">Stripe Information</h4>
                <div className="text-sm space-y-1 bg-muted p-3 rounded-lg">
                  <p><span className="font-medium">Payout ID:</span> {detailedStatus.stripe_status.stripe_payout_id}</p>
                  <p><span className="font-medium">Status:</span> {detailedStatus.stripe_status.status}</p>
                  {detailedStatus.stripe_status.arrival_date && (
                    <p><span className="font-medium">Arrival Date:</span> {new Date(detailedStatus.stripe_status.arrival_date * 1000).toLocaleString()}</p>
                  )}
                  {detailedStatus.stripe_status.balance_transaction && (
                    <p><span className="font-medium">Balance Transaction:</span> {detailedStatus.stripe_status.balance_transaction}</p>
                  )}
                </div>
              </div>
            )}

            {/* Error Details */}
            {payout.failure_message && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Error Details</h4>
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  <p><span className="font-medium">Code:</span> {payout.failure_code}</p>
                  <p><span className="font-medium">Message:</span> {payout.failure_message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <button
                onClick={fetchDetailedStatus}
                disabled={loading}
                className="btn btn-ghost btn-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <div className="flex items-center gap-2">
              {canProcess && (
                <button
                  onClick={handleProcessPayout}
                  disabled={processing}
                  className="btn btn-primary btn-sm"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Process Payout"
                  )}
                </button>
              )}
              {canCancel && (
                <button
                  onClick={handleCancelPayout}
                  disabled={cancelling}
                  className="btn btn-destructive btn-sm"
                >
                  {cancelling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Cancel
                    </>
                  )}
                </button>
              )}
              <button onClick={onClose} className="btn btn-ghost btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
