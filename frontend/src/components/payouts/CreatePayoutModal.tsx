import { useEffect, useRef, useState } from "react";
import { useToast } from "../toast/ToastProvider";
import { ChevronDown } from "lucide-react";
import { createPayout } from "../../lib/api";
import type { Beneficiary, Destination, PayoutCreate } from "../../types/index";
import BeneficiarySelect from "../beneficiaries/BeneficiarySelect";
import DestinationSelect from "../destinations/DestinationSelect";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (payout: any) => void;
};

// Currency configuration for better UX
const CURRENCIES = [
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
] as const;

// Custom Dropdown Component
function CustomSelect({ 
  value, 
  onChange, 
  options, 
  disabled = false 
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { code: string; name: string; symbol: string; flag: string }[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.code === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="select w-full justify-between"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.flag} {selectedOption?.name} ({selectedOption?.code})
        </span>
        <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-md shadow-xl">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              className="w-full px-3 py-2 text-left text-sm  hover:text-amber-200 text-foreground flex items-center gap-2 first:rounded-t-md last:rounded-b-md transition-all duration-200 relative overflow-hidden group cursor-pointer"
              onClick={() => {
                onChange(option.code);
                setIsOpen(false);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <span className="relative z-10">
                {option.flag} {option.name} ({option.code})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreatePayoutModal({ open, onClose, onCreated }: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>("100.00");
  const [currency, setCurrency] = useState<"ZAR" | "USD" | "EUR" | "GBP">("ZAR");
  const [memo, setMemo] = useState<string>("");
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      setError(null);
      setSubmitting(false);
      // Reset form
      setAmount("100.00");
      setCurrency("ZAR");
      setMemo("");
      setBeneficiaryId(null);
      setDestinationId(null);
      setSelectedBeneficiary(null);
      setSelectedDestination(null);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // Reset destination when beneficiary changes
  useEffect(() => {
    setDestinationId(null);
    setSelectedDestination(null);
  }, [beneficiaryId]);

  // Helper function to convert amount to cents for API
  const convertToCents = (amount: string): number => {
    const amountValue = parseFloat(amount);
    return Math.round(amountValue * 100);
  };

  // Helper function to format currency display
  const formatCurrency = (amount: string, currencyCode: string): string => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    if (!currency) return amount;
    return `${currency.symbol}${amount}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountValue = parseFloat(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0.",
      });
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (amountValue < 0.01) {
      toast.error({
        title: "Amount too small",
        description: "Minimum amount is 0.01.",
      });
      setError("Minimum amount is 0.01.");
      return;
    }

    if (!beneficiaryId) {
      toast.error({
        title: "Beneficiary required",
        description: "Please select a beneficiary.",
      });
      setError("Please select a beneficiary.");
      return;
    }

    if (!destinationId) {
      toast.error({
        title: "Destination required",
        description: "Please select a destination.",
      });
      setError("Please select a destination.");
      return;
    }

    const payload: PayoutCreate = {
      beneficiary_id: beneficiaryId,
      destination_id: destinationId,
      amount: convertToCents(amount),
      currency,
      memo: memo.trim() || undefined,
    };

    setSubmitting(true);
    try {
      console.log("Creating payout:", payload);
      const data = await createPayout(payload);
      console.log("Payout created successfully:", data);
      onCreated?.(data);
      onClose();
    } catch (err: any) {
      console.error("Failed to create payout:", err);
      const errorMessage = err?.message || "Failed to create payout";
      toast.error({
        title: "Failed to create payout",
        description: `Unable to create payout. ${errorMessage}`,
      });
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedCurrency = CURRENCIES.find(c => c.code === currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !submitting && onClose()}
        aria-hidden
      />
      
      {/* dialog */}
      <div className="relative z-10 w-full max-w-lg card p-6 border shadow-lg animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">💸</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create Payout</h2>
              <p className="text-sm text-muted-foreground">
                Transfer funds to a saved beneficiary
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm px-4 py-3 flex items-start gap-2">
            <span className="text-destructive">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Beneficiary Field */}
          <div className="space-y-2">
            <label className="label">Beneficiary</label>
            <BeneficiarySelect
              value={beneficiaryId}
              onChange={(id) => {
                setBeneficiaryId(id);
                if (!id) {
                  setSelectedBeneficiary(null);
                }
              }}
              onBeneficiaryCreated={(beneficiary) => {
                setSelectedBeneficiary(beneficiary);
                setBeneficiaryId(beneficiary.id);
              }}
              onBeneficiarySelected={(beneficiary) => {
                setSelectedBeneficiary(beneficiary);
              }}
              disabled={submitting}
            />
          </div>

          {/* Destination Field */}
          <div className="space-y-2">
            <label className="label">Destination</label>
            <DestinationSelect
              beneficiaryId={beneficiaryId}
              value={destinationId}
              onChange={(id) => {
                setDestinationId(id);
                if (!id) {
                  setSelectedDestination(null);
                }
              }}
              onDestinationCreated={(destination) => {
                setSelectedDestination(destination);
                setDestinationId(destination.id);
              }}
              onDestinationSelected={(destination) => {
                setSelectedDestination(destination);
              }}
              disabled={submitting}
            />
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                {selectedCurrency?.symbol}
              </div>
              <input
                id="amount"
                ref={firstFieldRef}
                className="input pl-8 pr-3"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  if (/^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="100.00"
                required
                disabled={submitting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum amount: {formatCurrency("0.01", currency)}
            </p>
          </div>

          {/* Currency Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="currency">
              Currency
            </label>
            <CustomSelect
              value={currency}
              onChange={(value) => setCurrency(value as any)}
              options={CURRENCIES}
              disabled={submitting}
            />
          </div>

          {/* Memo Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="memo">
              Memo (optional)
            </label>
            <input
              id="memo"
              className="input w-full"
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment for services"
              disabled={submitting}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">Payout Summary</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCurrency(amount, currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-medium">{selectedCurrency?.flag} {selectedCurrency?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Beneficiary:</span>
              <span className="font-medium">{selectedBeneficiary?.name || "Not selected"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-medium">{selectedDestination?.label || "Not selected"}</span>
            </div>
            {memo && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Memo:</span>
                <span className="font-medium">{memo}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="btn btn-ghost cursor-pointer"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary min-w-[100px] cursor-pointer" 
              disabled={submitting || !amount || !beneficiaryId || !destinationId}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                "Create Payout"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}