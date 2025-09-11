import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { listDestinations, createBankDestination } from "../../lib/api";
import type { Destination } from "../../types/index";

interface DestinationSelectProps {
  beneficiaryId: string | null;
  value: string | null;
  onChange: (destinationId: string | null) => void;
  onDestinationCreated?: (destination: Destination) => void;
  onDestinationSelected?: (destination: Destination) => void;
  disabled?: boolean;
}

export default function DestinationSelect({
  beneficiaryId,
  value,
  onChange,
  onDestinationCreated,
  onDestinationSelected,
  disabled = false,
}: DestinationSelectProps) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDestination = destinations.find((d) => d.id === value);

  // Load destinations when beneficiary changes
  useEffect(() => {
    if (!beneficiaryId) {
      setDestinations([]);
      onChange(null);
      return;
    }

    const loadDestinations = async () => {
      setLoading(true);
      try {
        const data = await listDestinations(beneficiaryId);
        setDestinations(data);
      } catch (error) {
        console.error("Failed to load destinations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDestinations();
  }, [beneficiaryId, onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateDestination = async (formData: FormData) => {
    if (!beneficiaryId) return;

    setCreateLoading(true);
    try {
      const payload = {
        type: "bank_account",
        country: formData.get("country") as string,
        currency: formData.get("currency") as string,
        account_number: formData.get("account_number") as string,
        routing_number: formData.get("routing_number") as string || undefined,
        iban: formData.get("iban") as string || undefined,
        bic: formData.get("bic") as string || undefined,
        label: formData.get("label") as string || undefined,
      };

      const newDestination = await createBankDestination(beneficiaryId, payload);
      setDestinations((prev) => [newDestination, ...prev]);
      onChange(newDestination.id);
      onDestinationCreated?.(newDestination);
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create destination:", error);
    } finally {
      setCreateLoading(false);
    }
  };

  if (!beneficiaryId) {
    return (
      <div className="select w-full justify-between min-w-[200px] opacity-50 cursor-not-allowed">
        <span className="text-muted-foreground">Select beneficiary first</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="select w-full justify-between min-w-[200px]"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          {selectedDestination ? (
            <>
              <span className="text-sm font-medium">{selectedDestination.label}</span>
              <span className="text-xs text-muted-foreground">
                {selectedDestination.currency}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select destination</span>
          )}
        </span>
        <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-md shadow-xl">
          {!showCreateForm ? (
            <>
              {loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : destinations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No destinations found</div>
              ) : (
                destinations.map((destination) => (
                  <button
                    key={destination.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:text-amber-200 text-foreground flex items-center gap-2 first:rounded-t-md last:rounded-b-md transition-all duration-200 relative overflow-hidden group cursor-pointer"
                    onClick={() => {
                      onChange(destination.id);
                      onDestinationSelected?.(destination);
                      setIsOpen(false);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <span className="relative z-10">
                      <div className="font-medium">{destination.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {destination.currency}
                        {destination.last4 && ` • ••••${destination.last4}`}
                      </div>
                    </span>
                  </button>
                ))
              )}
              <div className="border-t border-border">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:text-amber-200 text-foreground flex items-center gap-2 rounded-b-md transition-all duration-200 relative overflow-hidden group cursor-pointer"
                  onClick={() => setShowCreateForm(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <span className="relative z-10 flex items-center gap-2">
                    <Plus className="size-4" />
                    Add bank account
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateDestination(new FormData(e.currentTarget));
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Country</label>
                    <input
                      name="country"
                      type="text"
                      className="input w-full"
                      placeholder="US"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Currency</label>
                    <input
                      name="currency"
                      type="text"
                      className="input w-full"
                      placeholder="USD"
                      maxLength={3}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Account Number</label>
                  <input
                    name="account_number"
                    type="text"
                    className="input w-full"
                    placeholder="1234567890"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Routing Number (US)</label>
                    <input
                      name="routing_number"
                      type="text"
                      className="input w-full"
                      placeholder="123456789"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Label (optional)</label>
                    <input
                      name="label"
                      type="text"
                      className="input w-full"
                      placeholder="Chase Checking"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">IBAN (International)</label>
                    <input
                      name="iban"
                      type="text"
                      className="input w-full"
                      placeholder="GB82WEST12345698765432"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">BIC/SWIFT</label>
                    <input
                      name="bic"
                      type="text"
                      className="input w-full"
                      placeholder="WESTGB22"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={createLoading}
                  >
                    {createLoading ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
