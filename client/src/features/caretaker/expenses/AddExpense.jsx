import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuWrench, LuZap, LuUsers, LuCircleDollarSign, LuReceipt, LuCheck } from "react-icons/lu";
import Card from "../../../components/common/Card.jsx";
import { getBuildings } from "../../../services/building.service.js";
import { createExpense } from "../../../services/expense.service.js";

// Mirrors the category set the owner's expense view already renders, so
// whatever the caretaker logs here slots straight into that breakdown.
const EXPENSE_CATEGORIES = [
  { id: "maintenance", label: "Maintenance", icon: LuWrench, tone: "bg-amber-50 text-amber-600" },
  { id: "utilities", label: "Utilities", icon: LuZap, tone: "bg-sky-50 text-sky-600" },
  { id: "salaries", label: "Salaries", icon: LuUsers, tone: "bg-violet-50 text-violet-600" },
  { id: "other", label: "Other", icon: LuCircleDollarSign, tone: "bg-slate-100 text-slate-500" },
];

const MAX_PAST_DAYS = 365;

const inputClasses =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none " +
  "focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const labelClasses = "text-xs font-semibold text-slate-500 uppercase tracking-wide";

const todayISO = () => new Date().toISOString().slice(0, 10);
const minDateISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - MAX_PAST_DAYS);
  return d.toISOString().slice(0, 10);
};

const INITIAL_FORM = {
  buildingId: "",
  category: "",
  amount: "",
  dateIncurred: todayISO(),
  description: "",
};

const AddExpense = () => {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingsError, setBuildingsError] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | submitting | submitted

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBuildingsLoading(true);
      try {
        const { buildings: list } = await getBuildings({ page: 1, limit: 100 });
        if (cancelled) return;
        const safeList = Array.isArray(list) ? list : [];
        setBuildings(safeList);
        if (safeList.length === 1) {
          setForm((prev) => ({ ...prev, buildingId: safeList[0].id }));
        }
      } catch (err) {
        if (!cancelled) setBuildingsError(err.message || "We couldn't load your buildings.");
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCategorySelect = (categoryId) => {
    setForm((prev) => ({ ...prev, category: categoryId }));
    setErrors((prev) => ({ ...prev, category: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.buildingId) next.buildingId = "Select a building.";
    if (!form.category) next.category = "Select an expense category.";
    if (!form.amount || Number(form.amount) <= 0) next.amount = "Enter an amount greater than 0.";
    if (!form.dateIncurred) next.dateIncurred = "Select a date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setStatus("submitting");
    try {
      await createExpense({
        buildingId: form.buildingId,
        category: form.category,
        amount: Number(form.amount),
        dateIncurred: form.dateIncurred,
        description: form.description,
      });
      setStatus("submitted");
    } catch (err) {
      setSubmitError(err.message || "Couldn't log this expense. Try again.");
      setStatus("idle");
    }
  };

  const handleLogAnother = () => {
    setForm({
      ...INITIAL_FORM,
      buildingId: buildings.length === 1 ? buildings[0].id : "",
    });
    setErrors({});
    setSubmitError(null);
    setStatus("idle");
  };

  if (status === "submitted") {
    const building = buildings.find((b) => b.id === form.buildingId);
    const category = EXPENSE_CATEGORIES.find((c) => c.id === form.category);

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Add Expense</h2>
          <p className="text-sm text-slate-500 mt-1">Log an expense for one of your assigned buildings.</p>
        </div>

        <Card className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <LuCheck size={26} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Expense logged</h3>
            <p className="text-sm text-slate-500 mt-1">
              {category?.label} · KES {Number(form.amount).toLocaleString("en-KE")} for {building?.name} has
              been recorded.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleLogAnother}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors cursor-pointer"
            >
              Log Another Expense
            </button>
            <button
              type="button"
              onClick={() => navigate("/caretaker/expenses")}
              className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              View Expense History
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Add Expense</h2>
        <p className="text-sm text-slate-500 mt-1">Log an expense for one of your assigned buildings.</p>
      </div>

      <Card className="p-0">
        <div className="flex items-start gap-3 p-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-50 text-brand-700 shrink-0">
            <LuReceipt aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Expense Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              This will appear on the owner's expense view under the matching building and category.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {buildingsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {buildingsError}
            </div>
          )}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="buildingId">
                Building
              </label>
              <select
                id="buildingId"
                value={form.buildingId}
                onChange={handleChange("buildingId")}
                disabled={buildingsLoading || buildings.length === 0}
                className={inputClasses}
              >
                <option value="" disabled>
                  {buildingsLoading ? "Loading buildings…" : "Select a building"}
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.buildingId && <p className="text-xs font-medium text-rose-600">{errors.buildingId}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="dateIncurred">
                Date Incurred
              </label>
              <input
                id="dateIncurred"
                type="date"
                value={form.dateIncurred}
                min={minDateISO()}
                max={todayISO()}
                onChange={handleChange("dateIncurred")}
                className={inputClasses}
              />
              {errors.dateIncurred && (
                <p className="text-xs font-medium text-rose-600">{errors.dateIncurred}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClasses}>Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {EXPENSE_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = form.category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c.id)}
                    className={`flex flex-col items-start gap-2.5 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active ? "border-brand-700 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.tone}`}>
                      <Icon aria-hidden="true" />
                    </div>
                    <span className={`text-xs font-semibold ${active ? "text-brand-700" : "text-slate-700"}`}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="text-xs font-medium text-rose-600">{errors.category}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="amount">
                Amount (KES)
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={form.amount}
                onChange={handleChange("amount")}
                onWheel={(e) => e.currentTarget.blur()}
                className={inputClasses}
              />
              {errors.amount && <p className="text-xs font-medium text-rose-600">{errors.amount}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="description">
              Description <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={500}
              placeholder="e.g. Plumber call-out for unit A5 leaking pipe"
              value={form.description}
              onChange={handleChange("description")}
              className={`${inputClasses} resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={status === "submitting" || buildings.length === 0}
              className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer w-fit"
            >
              {status === "submitting" ? "Logging…" : "Log Expense"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddExpense;
