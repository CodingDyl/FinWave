import { useEffect, useMemo, useState, useRef } from "react";
import DataTable, { type Column } from "../components/table/DataTable";
import CreatePayoutModal from "../components/payouts/CreatePayoutModal";
import { useToast } from "../components/toast/ToastProvider";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { ChevronDown } from "lucide-react";
import api from "../lib/api";
import { downloadCsv } from "../lib/csv";
import type { Payout } from "../types/index";

/* ------------------------- Status filter dropdown (unchanged) ------------------------- */

const STATUS_OPTIONS = [
  { value: "all", label: "All", icon: "📊" },
  { value: "pending", label: "Pending", icon: "⏳" },
  { value: "processing", label: "Processing", icon: "🔄" },
  { value: "paid", label: "Paid", icon: "✅" },
  { value: "failed", label: "Failed", icon: "❌" },
] as const;

function StatusDropdown({
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
  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === value);

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
        className="select w-full justify-between min-w-[120px]"
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
          {STATUS_OPTIONS.map((option) => (
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

function formatMoney(cents: number, currency: string) {
  const v = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}
function statusBadge(s: Payout["status"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs border";
  const by: Record<Payout["status"], string> = {
    pending: "bg-muted text-muted-foreground border-border",
    processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    paid: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
    canceled: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/30",
  };
  return `${base} ${by[s]}`;
}

/* ----------------------------- Column visibility + IDs ----------------------------- */

type ColId = "created" | "beneficiary" | "amount" | "destination" | "status" | "actions";
const ALL_IDS: ColId[] = ["created", "beneficiary", "amount", "destination", "status", "actions"];
const LS_KEY = "payouts.visibleCols";

/* ===================================== Page ===================================== */

export default function Payouts() {
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Payout["status"]>("all");

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
  const COLS: Record<ColId, Column<Payout>> = useMemo(
    () => ({
      created: {
        header: "Created",
        sortable: true,
        sortAccessor: (r) => new Date(r.created_at),
        render: (r) => new Date(r.created_at).toLocaleString(),
      },
      beneficiary: {
        header: "Beneficiary",
        sortable: true,
        sortAccessor: (r) => r.beneficiary.name,
        render: (r) => (
          <div>
            <div className="font-medium">{r.beneficiary.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {r.beneficiary.type}
              {r.beneficiary.country && ` • ${r.beneficiary.country}`}
            </div>
          </div>
        ),
      },
      amount: {
        header: "Amount",
        align: "right",
        sortable: true,
        sortAccessor: (r) => r.amount,
        render: (r) => <span className="font-medium">{formatMoney(r.amount, r.currency)}</span>,
      },
      destination: {
        header: "Destination",
        sortable: true,
        sortAccessor: (r) => r.destination.label,
        render: (r) => (
          <div>
            <div className="font-medium">{r.destination.label}</div>
            <div className="text-xs text-muted-foreground">
              {r.destination.currency}
              {r.destination.last4 && ` • ••••${r.destination.last4}`}
            </div>
          </div>
        ),
      },
      status: {
        header: "Status",
        sortable: true,
        sortAccessor: (r) => r.status,
        render: (r) => <span className={statusBadge(r.status)}>{r.status}</span>,
      },
      actions: {
        header: "",
        align: "right",
        render: () => <button className="btn btn-ghost h-8 px-2">View</button>,
      },
    }),
    []
  );

  const columns = useMemo(
    () => ALL_IDS.filter((id) => visible.has(id)).map((id) => COLS[id]),
    [COLS, visible]
  );

  /* ------------------------ Data fetching + client-side filtering ------------------------ */

  const [allPayouts, setAllPayouts] = useState<Payout[]>([]);

  async function fetchPayouts() {
    setLoading(true);
    try {
      console.log("Fetching payouts...");
      const { data } = await api.get("/api/v1/payouts", { cacheTTL: 30000 });
      const payouts = Array.isArray(data) ? data : data?.items ?? [];
      console.log("Payouts loaded successfully:", payouts);
      setAllPayouts(payouts);
    } catch (err: any) {
      console.error("Failed to fetch payouts:", err);
      const errorMessage = err?.message || "Network error";
      toast.error({
        title: "Failed to load payouts",
        description: `Unable to load payouts. ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter payouts based on search query and status
  const filteredPayouts = useMemo(() => {
    let filtered = allPayouts;

    // Filter by status
    if (status !== "all") {
      filtered = filtered.filter(payout => payout.status === status);
    }

    // Filter by search query
    if (debounced.trim()) {
      const query = debounced.toLowerCase().trim();
      filtered = filtered.filter(payout => {
        const amount = formatMoney(payout.amount, payout.currency).toLowerCase();
        const beneficiary = `${payout.beneficiary.name} ${payout.beneficiary.type}`.toLowerCase();
        const destination = `${payout.destination.label} ${payout.destination.currency}`.toLowerCase();
        const statusText = payout.status.toLowerCase();
        const created = new Date(payout.created_at).toLocaleString().toLowerCase();
        const memo = payout.memo?.toLowerCase() || "";
        
        return amount.includes(query) || 
               beneficiary.includes(query) ||
               destination.includes(query) || 
               statusText.includes(query) || 
               created.includes(query) ||
               memo.includes(query);
      });
    }

    return filtered;
  }, [allPayouts, status, debounced]);

  // Update displayed rows when filtered data changes
  useEffect(() => {
    setRows(filteredPayouts);
  }, [filteredPayouts]);

  // Initial load
  useEffect(() => {
    fetchPayouts();
  }, []);

  const onRefresh = () => {
    // Cache will be invalidated by the api client
    fetchPayouts();
  };

  const handleCreated = (apiResp: any) => {
    console.log("Payout created:", apiResp);
    const p: Payout = {
      id: apiResp.id ?? crypto.randomUUID(),
      created_at: apiResp.created_at ?? new Date().toISOString(),
      amount: apiResp.amount,
      currency: apiResp.currency,
      beneficiary: apiResp.beneficiary,
      destination: apiResp.destination,
      status: apiResp.status ?? "pending",
      memo: apiResp.memo,
      external_id: apiResp.external_id,
      failure_code: apiResp.failure_code,
      failure_message: apiResp.failure_message,
      idempotency_key: apiResp.idempotency_key,
    };
    setAllPayouts((prev) => [p, ...prev]);
    // Cache will be invalidated by the api client
    toast.success({
      title: "Payout created",
      description: `Queued ${formatMoney(p.amount, p.currency)} to ${p.beneficiary.name}`,
    });
  };

  /* -------------------------------------- CSV export -------------------------------------- */

  const exportCsv = () => {
    const visIds = ALL_IDS.filter((id) => visible.has(id) && id !== "actions");
    const headers = visIds.map((id) => COLS[id].header);
    const body = filteredPayouts.map((r) =>
      visIds.map((id) => {
        switch (id) {
          case "created":
            return new Date(r.created_at).toLocaleString();
          case "beneficiary":
            return `${r.beneficiary.name} (${r.beneficiary.type})`;
          case "amount":
            return formatMoney(r.amount, r.currency);
          case "destination":
            return `${r.destination.label} (${r.destination.currency})`;
          case "status":
            return r.status;
          default:
            return "";
        }
      })
    );
    downloadCsv("payouts.csv", [headers, ...body]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Client-side search and filtering with column visibility and CSV export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost cursor-pointer hover:text-indigo-600" onClick={onRefresh}>
            Refresh
          </button>
          <button className="btn btn-primary cursor-pointer hover:text-indigo-600" onClick={() => setOpen(true)}>
            Create Payout
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            className="input w-full pl-8"
            placeholder="Search payouts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="label text-xs">Status</label>
          <StatusDropdown value={status} onChange={(value) => setStatus(value as any)} />
        </div>

        <ColumnsMenu visible={visible} toggle={toggleCol} reset={resetCols} />

        <button className="btn btn-ghost cursor-pointer hover:text-indigo-600" onClick={exportCsv}>
          Export CSV
        </button>

        {(query || status !== "all") && (
          <button
            className="btn btn-ghost cursor-pointer hover:text-indigo-600"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <DataTable<Payout>
        columns={columns}
        data={rows}
        loading={loading}
        skeletonRows={8}
        empty={<span className="text-muted-foreground">No payouts found.</span>}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
      />

      <CreatePayoutModal open={open} onClose={() => setOpen(false)} onCreated={handleCreated} />
    </div>
  );
}

/* ------------------------------- Columns dropdown (new) ------------------------------- */

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
  const ids: ColId[] = ["created", "beneficiary", "amount", "destination", "status", "actions"];
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
