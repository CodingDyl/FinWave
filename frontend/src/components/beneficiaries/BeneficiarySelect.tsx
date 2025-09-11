import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { listBeneficiaries, createBeneficiary } from "../../lib/api";
import type { Beneficiary } from "../../types/index";

interface BeneficiarySelectProps {
  value: string | null;
  onChange: (beneficiaryId: string | null) => void;
  onBeneficiaryCreated?: (beneficiary: Beneficiary) => void;
  onBeneficiarySelected?: (beneficiary: Beneficiary) => void;
  disabled?: boolean;
}

export default function BeneficiarySelect({
  value,
  onChange,
  onBeneficiaryCreated,
  onBeneficiarySelected,
  disabled = false,
}: BeneficiarySelectProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedBeneficiary = beneficiaries.find((b) => b.id === value);

  // Load beneficiaries
  useEffect(() => {
    const loadBeneficiaries = async () => {
      setLoading(true);
      try {
        const data = await listBeneficiaries();
        setBeneficiaries(data);
      } catch (error) {
        console.error("Failed to load beneficiaries:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBeneficiaries();
  }, []);

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

  const handleCreateBeneficiary = async (formData: FormData) => {
    setCreateLoading(true);
    try {
      const payload = {
        type: formData.get("type") as string,
        name: formData.get("name") as string,
        email: formData.get("email") as string || undefined,
        country: formData.get("country") as string || undefined,
      };

      const newBeneficiary = await createBeneficiary(payload);
      setBeneficiaries((prev) => [newBeneficiary, ...prev]);
      onChange(newBeneficiary.id);
      onBeneficiaryCreated?.(newBeneficiary);
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create beneficiary:", error);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="select w-full justify-between min-w-[200px]"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          {selectedBeneficiary ? (
            <>
              <span className="text-sm font-medium">{selectedBeneficiary.name}</span>
              <span className="text-xs text-muted-foreground">
                ({selectedBeneficiary.type})
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select beneficiary</span>
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
              ) : beneficiaries.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No beneficiaries found</div>
              ) : (
                beneficiaries.map((beneficiary) => (
                  <button
                    key={beneficiary.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:text-amber-200 text-foreground flex items-center gap-2 first:rounded-t-md last:rounded-b-md transition-all duration-200 relative overflow-hidden group cursor-pointer"
                    onClick={() => {
                      onChange(beneficiary.id);
                      onBeneficiarySelected?.(beneficiary);
                      setIsOpen(false);
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <span className="relative z-10">
                      <div className="font-medium">{beneficiary.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {beneficiary.type}
                        {beneficiary.country && ` • ${beneficiary.country}`}
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
                    Add new beneficiary
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateBeneficiary(new FormData(e.currentTarget));
                }}
                className="space-y-3"
              >
                <div>
                  <label className="label text-xs">Type</label>
                  <select name="type" className="input w-full" required>
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Name</label>
                  <input
                    name="name"
                    type="text"
                    className="input w-full"
                    placeholder="Beneficiary name"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">Email (optional)</label>
                  <input
                    name="email"
                    type="email"
                    className="input w-full"
                    placeholder="beneficiary@example.com"
                  />
                </div>
                <div>
                  <label className="label text-xs">Country (optional)</label>
                  <input
                    name="country"
                    type="text"
                    className="input w-full"
                    placeholder="US"
                    maxLength={2}
                  />
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
