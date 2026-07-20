import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch, LuFilePlus2, LuReceipt } from "react-icons/lu";
import Card from "../../../components/common/Card.jsx";
import Table from "../../../components/common/Table.jsx";
import Badge from "../../../components/common/Badge.jsx";
import Shell from "../../../components/common/Shell.jsx";
import {
  formatCurrency,
  formatDate,
} from "../../../components/constast/Constasts.js";
import { getBuildings } from "../../../services/building.service.js";
import { getBills } from "../../../services/bill.service.js";

const STATUS_TONE = {
  paid: "success",
  partial: "warning",
  unpaid: "default",
  overdue: "danger",
};
const STATUS_LABEL = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

const BILL_TYPE_LABELS = {
  rent: "Rent",
  water: "Water",
  electricity: "Electricity",
  garbage: "Garbage",
  serviceCharge: "Service Charge",
  other: "Other",
};

const selectClasses =
  "px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none " +
  "focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const Bills = () => {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBuildingsLoading(true);
      try {
        const { buildings: list } = await getBuildings({ page: 1, limit: 100 });
        if (cancelled) return;
        const safeList = Array.isArray(list) ? list : [];
        setBuildings(safeList);
        if (safeList.length > 0) setBuildingId(safeList[0].id);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "We couldn't load your buildings.");
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!buildingId) {
      setBills([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { items } = await getBills(buildingId, { page: 1, limit: 100 });
        if (!cancelled) setBills(Array.isArray(items) ? items : []);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "We couldn't load your bills. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const filteredBills = useMemo(() => {
    const list = Array.isArray(bills) ? bills : [];
    const term = search.trim().toLowerCase();
    return list.filter((b) => {
      const tenantName = b.tenantName?.toLowerCase() ?? "";
      const unit = b.unit?.toLowerCase() ?? "";
      const matchesTerm =
        !term || tenantName.includes(term) || unit.includes(term);
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const totals = useMemo(() => {
    const list = Array.isArray(bills) ? bills : [];
    const outstanding = list.reduce((sum, b) => sum + (b.balance ?? 0), 0);
    const overdueCount = list.filter((b) => b.status === "overdue").length;
    return { outstanding, overdueCount };
  }, [bills]);

  const columns = useMemo(
    () => [
      {
        key: "tenantName",
        label: "Tenant",
        render: (r) => r.tenantName ?? "—",
      },
      { key: "unit", label: "Unit", render: (r) => r.unit ?? "—" },
      {
        key: "type",
        label: "Bill Type",
        render: (r) => BILL_TYPE_LABELS[r.type] ?? r.type,
      },
      {
        key: "amount",
        label: "Amount",
        render: (r) => formatCurrency(r.amount),
      },
      {
        key: "balance",
        label: "Balance",
        render: (r) => formatCurrency(r.balance),
      },
      {
        key: "dueDate",
        label: "Due Date",
        render: (r) => formatDate(r.dueDate),
      },
      {
        key: "status",
        label: "Status",
        render: (r) => (
          <Badge tone={STATUS_TONE[r.status] ?? "default"}>
            {STATUS_LABEL[r.status] ?? r.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bills</h2>
          <p className="text-sm text-slate-500 mt-1">
            Rent and utility bills across your assigned buildings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/caretaker/bills/add")}
          disabled={buildings.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LuFilePlus2 aria-hidden="true" />
          Post Bill
        </button>
      </div>

      {!loading && !error && bills.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-5">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Total Outstanding
            </p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(totals.outstanding)}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Overdue Bills
            </p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {totals.overdueCount}
            </p>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          aria-label="Select building"
          disabled={buildingsLoading || buildings.length === 0}
          className={selectClasses}
        >
          {buildingsLoading && <option>Loading buildings…</option>}
          {!buildingsLoading && buildings.length === 0 && (
            <option>No assigned buildings</option>
          )}
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="relative flex-1 max-w-sm">
          <LuSearch
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tenant or unit…"
            aria-label="Search bills"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={selectClasses}
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <Shell
        loading={loading || buildingsLoading}
        error={error}
        isEmpty={filteredBills.length === 0}
        loadingLabel="Loading bills…"
        emptyIcon={LuReceipt}
        emptyTitle={
          buildings.length === 0 ? "No assigned buildings" : "No bills found"
        }
        emptyDescription={
          buildings.length === 0
            ? "You haven't been assigned to any building yet."
            : search || statusFilter !== "all"
              ? "Try a different search term or filter."
              : "Bills you post will show up here."
        }
      >
        <Card className="p-0">
          <Table columns={columns} data={filteredBills} keyField="id" />
        </Card>
      </Shell>
    </div>
  );
};

export default Bills;
