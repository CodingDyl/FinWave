import { useEffect, useRef, useState } from "react";
import { useToast } from "../toast/ToastProvider";
import { ChevronDown } from "lucide-react";
import api from "../../lib/api";

type Destination = { type: "bank_account"; last4: string };
export type CreatePayoutPayload = {
  amount: number;           // cents (for API compatibility)
  currency: "ZAR" | "USD" | "EUR" | "GBP";
  destination: Destination;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (payout: any) => void; // shape left open to match your API
};

function uuid() {
  return (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
}

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
  const [last4, setLast4] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // Helper function to convert Rands to cents for API
  const convertToCents = (randAmount: string): number => {
    const amount = parseFloat(randAmount);
    return Math.round(amount * 100);
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
        description: "Minimum amount is R0.01.",
      });
      setError("Minimum amount is R0.01.");
      return;
    }

    if (!/^\d{4}$/.test(last4)) {
      toast.error({
        title: "Invalid account number",
        description: "Please enter the last 4 digits of the account number.",
      });
      setError("Please enter the last 4 digits of the account number.");
      return;
    }

    const payload: CreatePayoutPayload = {
      amount: convertToCents(amount), // Convert Rands to cents for API
      currency,
      destination: { type: "bank_account", last4 },
    };

    setSubmitting(true);
    try {
      const { data } = await api.post("/api/v1/payouts", payload, {
        idempotencyKey: uuid(),
      });
      onCreated?.(data);
      onClose();
    } catch (err: any) {
      toast.error({
        title: "Failed to create payout",
        description: err?.message || "Failed to create payout",
      });
      setError(err?.message || "Failed to create payout");
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
                Transfer funds to a bank account
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

          {/* Bank Account Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="last4">
              Bank Account (Last 4 digits)
            </label>
            <input
              id="last4"
              className="input w-full tracking-widest text-center"
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              required
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Enter the last 4 digits of the destination account
            </p>
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
              <span className="text-muted-foreground">Account:</span>
              <span className="font-medium">****{last4 || "1234"}</span>
            </div>
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
              disabled={submitting || !amount || !last4}
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

