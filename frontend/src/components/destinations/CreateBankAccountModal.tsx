import { useEffect, useRef, useState } from "react";
import { useToast } from "../toast/ToastProvider";
import { ChevronDown } from "lucide-react";
import { createBankDestination } from "../../lib/api";
import type { Destination } from "../../types/index";

type Props = {
  open: boolean;
  onClose: () => void;
  beneficiaryId: string;
  beneficiaryName: string;
  onCreated?: (destination: Destination) => void;
};

// Country configuration for better UX
const COUNTRIES = [
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
] as const;

// Currency configuration
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
  options: readonly { code: string; name: string; flag: string; symbol?: string }[];
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
        <div className="absolute z-[9999] w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-md shadow-xl max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:text-amber-200 text-foreground flex items-center gap-2 first:rounded-t-md last:rounded-b-md transition-all duration-200 relative overflow-hidden group cursor-pointer"
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

export default function CreateBankAccountModal({ 
  open, 
  onClose, 
  beneficiaryId, 
  beneficiaryName, 
  onCreated 
}: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [currency, setCurrency] = useState<string>("ZAR");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [routingNumber, setRoutingNumber] = useState<string>("");
  const [iban, setIban] = useState<string>("");
  const [bic, setBic] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      setError(null);
      setSubmitting(false);
      // Reset form
      setLabel("");
      setCountry("");
      setCurrency("ZAR");
      setAccountNumber("");
      setRoutingNumber("");
      setIban("");
      setBic("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // Auto-generate label when account number or IBAN is entered
  useEffect(() => {
    if (accountNumber || iban) {
      const last4 = accountNumber ? accountNumber.slice(-4) : iban.slice(-4);
      const countryPrefix = country ? `${country.toUpperCase()} ` : "";
      setLabel(`${countryPrefix}Bank ••••${last4}`);
    }
  }, [accountNumber, iban, country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!country) {
      toast.error({
        title: "Country required",
        description: "Please select a country for the bank account.",
      });
      setError("Please select a country for the bank account.");
      return;
    }

    if (!currency) {
      toast.error({
        title: "Currency required",
        description: "Please select a currency for the bank account.",
      });
      setError("Please select a currency for the bank account.");
      return;
    }

    if (!accountNumber && !iban) {
      toast.error({
        title: "Account details required",
        description: "Please provide either an account number or IBAN.",
      });
      setError("Please provide either an account number or IBAN.");
      return;
    }

    const payload = {
      type: "bank_account" as const,
      country,
      currency,
      account_number: accountNumber || undefined,
      routing_number: routingNumber || undefined,
      iban: iban || undefined,
      bic: bic || undefined,
      label: label || undefined,
    };

    setSubmitting(true);
    try {
      console.log(`Creating bank account for beneficiary ${beneficiaryId}:`, payload);
      const data = await createBankDestination(beneficiaryId, payload);
      console.log("Bank account created successfully:", data);
      
      onCreated?.(data);
      onClose();
      toast.success({
        title: "Bank account added",
        description: `Bank account has been added to ${beneficiaryName}.`,
      });
    } catch (err: any) {
      console.error("Failed to create bank account:", err);
      const errorMessage = err?.message || "Failed to create bank account";
      toast.error({
        title: "Failed to add bank account",
        description: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedCountry = COUNTRIES.find(c => c.code === country);
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
              <span className="text-lg">🏦</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add Bank Account</h2>
              <p className="text-sm text-muted-foreground">
                Add a bank account for {beneficiaryName}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Country Field */}
          <div className="space-y-2">
            <label className="label">Country *</label>
            <CustomSelect
              value={country}
              onChange={setCountry}
              options={COUNTRIES}
              disabled={submitting}
            />
          </div>

          {/* Currency Field */}
          <div className="space-y-2">
            <label className="label">Currency *</label>
            <CustomSelect
              value={currency}
              onChange={setCurrency}
              options={CURRENCIES}
              disabled={submitting}
            />
          </div>

          {/* Account Number Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="accountNumber">
              Account Number
            </label>
            <input
              id="accountNumber"
              ref={firstFieldRef}
              className="input w-full"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="1234567890"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Required if IBAN is not provided
            </p>
          </div>

          {/* IBAN Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="iban">
              IBAN
            </label>
            <input
              id="iban"
              className="input w-full"
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="GB82WEST12345698765432"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Required if account number is not provided
            </p>
          </div>

          {/* Routing Number Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="routingNumber">
              Routing Number (optional)
            </label>
            <input
              id="routingNumber"
              className="input w-full"
              type="text"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              placeholder="021000021"
              disabled={submitting}
            />
          </div>

          {/* BIC Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="bic">
              BIC/SWIFT (optional)
            </label>
            <input
              id="bic"
              className="input w-full"
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value)}
              placeholder="DEUTDEFF"
              disabled={submitting}
            />
          </div>

          {/* Label Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="label">
              Label (optional)
            </label>
            <input
              id="label"
              className="input w-full"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Auto-generated from account details"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-generate from account details
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">Bank Account Summary</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Country:</span>
              <span className="font-medium">{selectedCountry?.flag} {selectedCountry?.name || "Not selected"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-medium">{selectedCurrency?.flag} {selectedCurrency?.name || "Not selected"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Account:</span>
              <span className="font-medium">
                {accountNumber ? `••••${accountNumber.slice(-4)}` : iban ? `••••${iban.slice(-4)}` : "Not provided"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Label:</span>
              <span className="font-medium">{label || "Auto-generated"}</span>
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
              disabled={submitting || !country || !currency || (!accountNumber && !iban)}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Adding...
                </div>
              ) : (
                "Add Bank Account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
