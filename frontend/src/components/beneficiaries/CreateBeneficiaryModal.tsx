import { useEffect, useRef, useState } from "react";
import { useToast } from "../toast/ToastProvider";
import { ChevronDown } from "lucide-react";
import { createBeneficiary } from "../../lib/api";
import type { Beneficiary } from "../../types/index";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (beneficiary: Beneficiary) => void;
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

// Custom Dropdown Component
function CustomSelect({ 
  value, 
  onChange, 
  options, 
  disabled = false 
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { code: string; name: string; flag: string }[];
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

export default function CreateBeneficiaryModal({ open, onClose, onCreated }: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [type, setType] = useState<"individual" | "business">("individual");
  const [country, setCountry] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      setError(null);
      setSubmitting(false);
      // Reset form
      setName("");
      setEmail("");
      setType("individual");
      setCountry("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      toast.error({
        title: "Name required",
        description: "Please enter a name for the beneficiary.",
      });
      setError("Please enter a name for the beneficiary.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error({
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      setError("Please enter a valid email address.");
      return;
    }

    const payload = {
      type,
      name: name.trim(),
      email: email.trim() || undefined,
      country: country || undefined,
    };

    setSubmitting(true);
    try {
      console.log("Creating beneficiary:", payload);
      const data = await createBeneficiary(payload);
      console.log("Beneficiary created successfully:", data);
      onCreated?.(data);
      onClose();
      toast.success({
        title: "Beneficiary created",
        description: `${data.name} has been added as a beneficiary.`,
      });
    } catch (err: any) {
      console.error("Failed to create beneficiary:", err);
      const errorMessage = err?.message || "Failed to create beneficiary";
      toast.error({
        title: "Failed to create beneficiary",
        description: `Unable to create beneficiary. ${errorMessage}`,
      });
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const selectedCountry = COUNTRIES.find(c => c.code === country);

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
              <span className="text-lg">👤</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add Beneficiary</h2>
              <p className="text-sm text-muted-foreground">
                Create a new beneficiary for payouts
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
          {/* Name Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              ref={firstFieldRef}
              className="input w-full"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe or Company Name"
              required
              disabled={submitting}
            />
          </div>

          {/* Type Field */}
          <div className="space-y-2">
            <label className="label">Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`p-3 rounded-lg border transition-all ${
                  type === "individual"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setType("individual")}
                disabled={submitting}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">👤</div>
                  <div className="text-sm font-medium">Individual</div>
                </div>
              </button>
              <button
                type="button"
                className={`p-3 rounded-lg border transition-all ${
                  type === "business"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setType("business")}
                disabled={submitting}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🏢</div>
                  <div className="text-sm font-medium">Business</div>
                </div>
              </button>
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="label" htmlFor="email">
              Email (optional)
            </label>
            <input
              id="email"
              className="input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              disabled={submitting}
            />
          </div>

          {/* Country Field */}
          <div className="space-y-2">
            <label className="label">Country (optional)</label>
            <CustomSelect
              value={country}
              onChange={setCountry}
              options={COUNTRIES}
              disabled={submitting}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">Beneficiary Summary</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{name || "Not entered"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium capitalize">{type}</span>
            </div>
            {email && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{email}</span>
              </div>
            )}
            {selectedCountry && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Country:</span>
                <span className="font-medium">{selectedCountry.flag} {selectedCountry.name}</span>
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
              disabled={submitting || !name.trim()}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                "Create Beneficiary"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
