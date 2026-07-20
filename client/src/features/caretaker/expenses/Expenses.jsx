import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuWrench,
  LuZap,
  LuUsers,
  LuCircleDollarSign,
  LuPlus,
  LuReceipt,
} from "react-icons/lu";
import Card from "../../../components/common/Card.jsx";
import Table from "../../../components/common/Table.jsx";
import Shell from "../../../components/common/Shell.jsx";
import { formatCurrency, formatDate } from "../../../components/constast/Constasts.js";
import { getBuildings } from "../../../services/building.service.js";
import { getExpenses } from "../../../services/expense.service.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const CATEGORY_META = {
  maintenance: { label: "Maintenance", icon: LuWrench, tone: "bg-amber-50 text-amber-600" },
  utilities: { label: "Utilities", icon: LuZap, tone: "bg-sky-50 text-sky-600" },
  salaries: { label: "Salaries", icon: LuUsers, tone: "bg-violet-50 text-violet-600" },
  other: { label: "Other", icon: LuCircleDollarSign, tone: "bg-slate-100 text-slate-500" },
};

const CATEGORY_FILTER_OPTIONS = [
  { id: "all", label: "All Categories" },
  { id: "maintenance", label: "Maintenance" },
  { id: "utilities", label: "Utilities" },
  { id: "salaries", label: "Salaries" },
  { id: "other", label: "Other" },
];

const selectClasses =
  "px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none " +
  "focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const CategoryCell = ({ category }) => {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.tone}`}>
        <Icon size={14} aria-hidden="true" />
      </div>
      <span className="text-slate-700">{meta.label}</span>
    </div>
  );
};

const Expenses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");

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
        if (!cancelled) setError(err.message || "We couldn't load your buildings.");
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
    let cancelled = false;

    const load = async () => {
      if (!buildingId) {
        setExpenses([]);
        setTotalAmount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = { page: 1, limit: 100 };
        if (categoryFilter !== "all") params.category = categoryFilter;
        const { items, totalAmount: total } = await getExpenses(buildingId, params);
        if (!cancelled) {
          setExpenses(Array.isArray(items) ? items : []);
          setTotalAmount(total || 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load expenses. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId, categoryFilter]);

  const columns = useMemo(() => {
    const base = [
      { key: "dateIncurred", label: "Date", render: (r) => formatDate(r.dateIncurred) },
      { key: "category", label: "Category", render: (r) => <CategoryCell category={r.category} /> },
      { key: "description", label: "Description", render: (r) => r.description || "—" },
      { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
    ];
    // Only worth showing "Logged By" when the viewer can see more than
    // their own entries — i.e. owners/admins looking across caretakers.
    if (isOwner) {
      base.splice(3, 0, {
        key: "loggedBy",
        label: "Logged By",
        render: (r) => r.loggedBy?.name ?? "—",
      });
    }
    return base;
  }, [isOwner]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isOwner
              ? "Expenses logged by your caretakers across your buildings."
              : "Expenses you've logged for your assigned buildings."}
          </p>
        </div>

        {!isOwner && (
          <button
            type="button"
            onClick={() => navigate("/caretaker/expenses/add")}
            disabled={buildings.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
             hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer w-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuPlus aria-hidden="true" />
            Add Expense
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          aria-label="Select building"
          disabled={buildingsLoading || buildings.length === 0}
          className={selectClasses}
        >
          {buildingsLoading && <option>Loading buildings…</option>}
          {!buildingsLoading && buildings.length === 0 && <option>No buildings</option>}
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className={selectClasses}
        >
          {CATEGORY_FILTER_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <Shell
        loading={loading || buildingsLoading}
        error={error}
        isEmpty={expenses.length === 0}
        loadingLabel="Loading expenses…"
        emptyIcon={LuReceipt}
        emptyTitle={buildings.length === 0 ? "No buildings" : "No expenses logged yet"}
        emptyDescription={
          buildings.length === 0
            ? "There are no buildings to show expenses for."
            : isOwner
              ? "Expenses your caretakers log will show up here."
              : "Expenses you log here will show up on the owner's revenue report."
        }
      >
        <>
          <Card className="p-0">
            <Table columns={columns} data={expenses} keyField="id" />
          </Card>
          <div className="flex justify-end">
            <p className="text-sm text-slate-500">
              Total for this selection:{" "}
              <span className="font-semibold text-slate-900">{formatCurrency(totalAmount)}</span>
            </p>
          </div>
        </>
      </Shell>
    </div>
  );
};

export default Expenses;
