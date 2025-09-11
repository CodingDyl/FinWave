import { useEffect, useMemo, useState, useRef } from "react";
import DataTable, { type Column } from "../components/table/DataTable";
import CreateBeneficiaryModal from "../components/beneficiaries/CreateBeneficiaryModal";
import UpdateBeneficiaryModal from "../components/beneficiaries/UpdateBeneficiaryModal";
import { useToast } from "../components/toast/ToastProvider";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { ChevronDown, UserPlus, Building2, User, Edit, Trash2 } from "lucide-react";
import { listBeneficiaries, deleteBeneficiary } from "../lib/api";
import type { Beneficiary } from "../types/index";

/* ------------------------- Type filter dropdown ------------------------- */

const TYPE_OPTIONS = [
  { value: "all", label: "All", icon: "👥" },
  { value: "individual", label: "Individual", icon: "👤" },
  { value: "business", label: "Business", icon: "🏢" },
] as const;

function TypeDropdown({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = TYPE_OPTIONS.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="select w-full justify-between min-w-[140px]"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon} {selectedOption?.label}
        </span>
        <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-md shadow-xl">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:text-amber-200 text-foreground flex items-center gap-2 first:rounded-t-md last:rounded-b-md transition-all duration-200 relative overflow-hidden group cursor-pointer"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <span className="relative z-10">
                {option.icon} {option.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------- Types/util --------------------------------------- */

function typeBadge(type: Beneficiary["type"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs border";
  const by: Record<Beneficiary["type"], string> = {
    individual: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    business: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  };
  return `${base} ${by[type]}`;
}

/* ----------------------------- Column visibility + IDs ----------------------------- */

type ColId = "name" | "type" | "email" | "country" | "created" | "actions";
const ALL_IDS: ColId[] = ["name", "type", "email", "country", "created", "actions"];
const LS_KEY = "beneficiaries.visibleCols";

/* ===================================== Page ===================================== */

export default function Beneficiaries() {
  const [rows, setRows] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | Beneficiary["type"]>("all");

  const debounced = useDebouncedValue(query, 400);
  const toast = useToast();

  // Visible columns persisted to localStorage
  const [visible, setVisible] = useState<Set<ColId>>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return new Set<ColId>(ALL_IDS);
      const parsed = JSON.parse(raw) as ColId[];
      return new Set(parsed.filter((x) => ALL_IDS.includes(x)));
    } catch {
      return new Set<ColId>(ALL_IDS);
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(visible)));
  }, [visible]);
  const toggleCol = (id: ColId) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        const remaining = Array.from(next).filter((x) => x !== id && x !== "actions");
        if (remaining.length === 0) return prev; // keep at least one data col
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const resetCols = () => setVisible(new Set(ALL_IDS));

  // Column defs record -> filtered by visibility for DataTable
  const COLS: Record<ColId, Column<Beneficiary>> = useMemo(
    () => ({
      name: {
        header: "Name",
        sortable: true,
        sortAccessor: (r) => r.name,
        render: (r) => (
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
              {r.type === "business" ? (
                <Building2 className="size-4 text-primary" />
              ) : (
                <User className="size-4 text-primary" />
              )}
            </div>
            <div>
              <div className="font-medium text-foreground">{r.name}</div>
              {r.email && (
                <div className="text-xs text-muted-foreground">{r.email}</div>
              )}
            </div>
          </div>
        ),
      },
      type: {
        header: "Type",
        sortable: true,
        sortAccessor: (r) => r.type,
        render: (r) => <span className={typeBadge(r.type)}>{r.type}</span>,
      },
      email: {
        header: "Email",
        sortable: true,
        sortAccessor: (r) => r.email || "",
        render: (r) => r.email || <span className="text-muted-foreground">—</span>,
      },
      country: {
        header: "Country",
        sortable: true,
        sortAccessor: (r) => r.country || "",
        render: (r) => r.country || <span className="text-muted-foreground">—</span>,
      },
      created: {
        header: "Created",
        sortable: true,
        sortAccessor: (r) => new Date(r.created_at || 0),
        render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
      },
      actions: {
        header: "",
        align: "right",
        render: (r) => (
          <div className="flex items-center gap-1">
            <button 
              className="btn btn-ghost h-8 px-2 text-xs"
              onClick={() => {
                setSelectedBeneficiary(r);
                setShowUpdate(true);
              }}
            >
              <Edit className="size-3" />
              Edit
            </button>
            <button 
              className="btn btn-ghost h-8 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => handleDelete(r)}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ),
      },
    }),
    []
  );

  const columns = useMemo(
    () => ALL_IDS.filter((id) => visible.has(id)).map((id) => COLS[id]),
    [COLS, visible]
  );

  /* ------------------------ Data fetching + client-side filtering ------------------------ */

  const [allBeneficiaries, setAllBeneficiaries] = useState<Beneficiary[]>([]);

  async function fetchBeneficiaries() {
    setLoading(true);
    try {
      console.log("Fetching beneficiaries...");
      const data = await listBeneficiaries();
      console.log("Beneficiaries loaded successfully:", data);
      setAllBeneficiaries(data);
    } catch (err: any) {
      console.error("Failed to fetch beneficiaries:", err);
      const errorMessage = err?.message || "Network error";
      toast.error({
        title: "Failed to load beneficiaries",
        description: `Unable to load beneficiaries. ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter beneficiaries based on search query and type
  const filteredBeneficiaries = useMemo(() => {
    let filtered = allBeneficiaries;

    // Filter by type
    if (type !== "all") {
      filtered = filtered.filter(beneficiary => beneficiary.type === type);
    }

    // Filter by search query
    if (debounced.trim()) {
      const query = debounced.toLowerCase().trim();
      filtered = filtered.filter(beneficiary => {
        const name = beneficiary.name.toLowerCase();
        const email = beneficiary.email?.toLowerCase() || "";
        const country = beneficiary.country?.toLowerCase() || "";
        const typeText = beneficiary.type.toLowerCase();
        
        return name.includes(query) || 
               email.includes(query) ||
               country.includes(query) || 
               typeText.includes(query);
      });
    }

    return filtered;
  }, [allBeneficiaries, type, debounced]);

  // Update displayed rows when filtered data changes
  useEffect(() => {
    setRows(filteredBeneficiaries);
  }, [filteredBeneficiaries]);

  // Initial load
  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const onRefresh = () => {
    fetchBeneficiaries();
  };

  const handleCreated = (beneficiary: Beneficiary) => {
    console.log("Beneficiary created:", beneficiary);
    setAllBeneficiaries((prev) => [beneficiary, ...prev]);
    toast.success({
      title: "Beneficiary created",
      description: `${beneficiary.name} has been added successfully.`,
    });
  };

  const handleUpdated = (updatedBeneficiary: Beneficiary) => {
    console.log("Beneficiary updated:", updatedBeneficiary);
    setAllBeneficiaries((prev) => 
      prev.map(b => b.id === updatedBeneficiary.id ? updatedBeneficiary : b)
    );
    setSelectedBeneficiary(null);
    toast.success({
      title: "Beneficiary updated",
      description: `${updatedBeneficiary.name} has been updated successfully.`,
    });
  };

  const handleDelete = async (beneficiary: Beneficiary) => {
    if (!confirm(`Are you sure you want to delete ${beneficiary.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`Deleting beneficiary ${beneficiary.id}:`, beneficiary);
      await deleteBeneficiary(beneficiary.id);
      console.log("Beneficiary deleted successfully");
      setAllBeneficiaries((prev) => prev.filter(b => b.id !== beneficiary.id));
      toast.success({
        title: "Beneficiary deleted",
        description: `${beneficiary.name} has been deleted successfully.`,
      });
    } catch (err: any) {
      console.error("Failed to delete beneficiary:", err);
      const errorMessage = err?.message || "Network error";
      toast.error({
        title: "Failed to delete beneficiary",
        description: `Unable to delete ${beneficiary.name}. ${errorMessage}`,
      });
    }
  };

  /* -------------------------------------- CSV export -------------------------------------- */

  const exportCsv = () => {
    const visIds = ALL_IDS.filter((id) => visible.has(id) && id !== "actions");
    const headers = visIds.map((id) => COLS[id].header);
    const body = filteredBeneficiaries.map((r) =>
      visIds.map((id) => {
        switch (id) {
          case "name":
            return r.name;
          case "type":
            return r.type;
          case "email":
            return r.email || "";
          case "country":
            return r.country || "";
          case "created":
            return r.created_at ? new Date(r.created_at).toLocaleDateString() : "";
          default:
            return "";
        }
      })
    );
    // Simple CSV export - you might want to use a proper CSV library
    const csvContent = [headers, ...body].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "beneficiaries.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Beneficiaries</h1>
          <p className="text-sm text-muted-foreground">
            Manage your payout beneficiaries and their bank accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost cursor-pointer hover:text-indigo-600" onClick={onRefresh}>
            Refresh
          </button>
          <button className="btn btn-primary cursor-pointer hover:text-indigo-600" onClick={() => setShowCreate(true)}>
            <UserPlus className="size-4" />
            Add Beneficiary
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            className="input w-full pl-8"
            placeholder="Search beneficiaries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="label text-xs">Type</label>
          <TypeDropdown value={type} onChange={(value) => setType(value as any)} />
        </div>

        <ColumnsMenu visible={visible} toggle={toggleCol} reset={resetCols} />

        <button className="btn btn-ghost cursor-pointer hover:text-indigo-600" onClick={exportCsv}>
          Export CSV
        </button>

        {(query || type !== "all") && (
          <button
            className="btn btn-ghost cursor-pointer hover:text-indigo-600"
            onClick={() => {
              setQuery("");
              setType("all");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <DataTable<Beneficiary>
        columns={columns}
        data={rows}
        loading={loading}
        skeletonRows={8}
        empty={<span className="text-muted-foreground">No beneficiaries found.</span>}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
      />

      <CreateBeneficiaryModal 
        open={showCreate} 
        onClose={() => setShowCreate(false)} 
        onCreated={handleCreated} 
      />
      
      <UpdateBeneficiaryModal
        open={showUpdate}
        onClose={() => {
          setShowUpdate(false);
          setSelectedBeneficiary(null);
        }}
        beneficiary={selectedBeneficiary}
        onUpdated={handleUpdated}
      />
    </div>
  );
}

/* ------------------------------- Columns dropdown ------------------------------- */

function ColumnsMenu({
  visible,
  toggle,
  reset,
}: {
  visible: Set<ColId>;
  toggle: (id: ColId) => void;
  reset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ids: ColId[] = ["name", "type", "email", "country", "created", "actions"];
  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
        Columns ▾
      </button>
      {open && (
        <div className="absolute right-0 z-[9999] backdrop-blur-md mt-2 w-52 card p-2 space-y-1 border-2 border-white">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Toggle columns</span>
            <button className="btn btn-ghost h-7 px-2 text-xs" onClick={reset}>
              Reset
            </button>
          </div>
          {ids.map((id) => (
            <label
              key={id}
              className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer"
            >
              <input type="checkbox" checked={visible.has(id)} onChange={() => toggle(id)} />
              <span className="text-sm capitalize">{id}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
