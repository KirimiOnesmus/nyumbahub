import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LuArrowLeft,
  LuLoaderCircle,
  LuCircleCheck,
  LuUser,
  LuUsers,
} from "react-icons/lu";
import Card from "../../../components/common/Card.jsx";
import { getBuildings } from "../../../services/building.service.js";
import { getTenants } from "../../../services/tenant.service.js";
import { createBill, createBillsBulk } from "../../../services/bill.service.js";

const inputClasses =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none " +
  "focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const labelClasses =
  "text-xs font-semibold uppercase tracking-widest text-slate-400";

const BILL_TYPES = [
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
  { value: "garbage", label: "Garbage" },
  { value: "serviceCharge", label: "Service Charge" },
  { value: "other", label: "Other" },
];

const MAX_DUE_DATE_DAYS_AHEAD = 90;
const todayISO = () => new Date().toISOString().slice(0, 10);
const maxDueDateISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DUE_DATE_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
};

const INITIAL_SINGLE_FORM = {
  tenantId: "",
  type: "",
  amount: "",
  dueDate: "",
  notes: "",
};
const INITIAL_BULK_FORM = {
  type: "",
  defaultAmount: "",
  dueDate: "",
  notes: "",
};

const Field = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelClasses}>
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

const ModeToggle = ({ mode, onChange, disabled }) => {
  const options = [
    { value: "single", label: "Single Tenant", icon: LuUser },
    { value: "bulk", label: "Multiple Tenants", icon: LuUsers },
  ];
  return (
    <div className="inline-flex p-1 bg-canvas rounded-xl border border-slate-200 self-start">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            mode === value
              ? "bg-white text-brand-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Icon aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
};

const TenantRow = ({ tenant, error, onToggle, onAmountChange }) => (
  <div className="flex flex-col border-b border-slate-100 last:border-b-0">
    <div className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={tenant.selected}
        onChange={() => onToggle(tenant.id)}
        aria-label={`Include ${tenant.label}`}
        className="w-4 h-4 rounded accent-brand-700 cursor-pointer shrink-0"
      />
      <span className="flex-1 text-sm font-medium text-slate-700 truncate">
        {tenant.label}
      </span>
      <div className="w-36 shrink-0">
        <input
          type="number"
          min="0"
          value={tenant.amount}
          disabled={!tenant.selected}
          onChange={(e) => onAmountChange(tenant.id, e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder="Amount"
          aria-label={`Amount for ${tenant.label}`}
          className={`${inputClasses} py-2 disabled:bg-canvas`}
        />
      </div>
    </div>
    {error && <p className="text-red-500 text-xs px-4 pb-2 -mt-1">{error}</p>}
  </div>
);

const AddBills = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedTenantId = location.state?.tenantId ?? "";
  const preselectedBuildingId = location.state?.buildingId ?? "";

  const [mode, setMode] = useState("single");

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState(preselectedBuildingId);

  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState("");

  const [singleForm, setSingleForm] = useState({
    ...INITIAL_SINGLE_FORM,
    tenantId: preselectedTenantId,
  });
  const [bulkForm, setBulkForm] = useState(INITIAL_BULK_FORM);
  const [tenantRows, setTenantRows] = useState([]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);

  const setSingleField = (key) => (e) =>
    setSingleForm((f) => ({ ...f, [key]: e.target.value }));
  const setBulkField = (key) => (e) =>
    setBulkForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBuildingsLoading(true);
      try {
        const { buildings: list } = await getBuildings({ page: 1, limit: 100 });
        if (cancelled) return;
        const safeList = Array.isArray(list) ? list : [];
        setBuildings(safeList);
        if (!preselectedBuildingId && safeList.length > 0)
          setBuildingId(safeList[0].id);
      } catch (err) {
        if (!cancelled)
          setSubmitError(err.message || "We couldn't load your buildings.");
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
    if (!buildingId) {
      setTenants([]);
      setTenantRows([]);
      return undefined;
    }

    const load = async () => {
      setTenantsLoading(true);
      setTenantsError("");
      try {
        const { tenants: list } = await getTenants(buildingId, {
          page: 1,
          limit: 100,
        });
        if (cancelled) return;
        const active = (Array.isArray(list) ? list : []).filter(
          (t) => t.status === "active",
        );
        setTenants(active);
        setTenantRows(
          active.map((t) => ({
            id: t._id,
            label: `${t.userId?.name ?? "Unknown"} — Unit ${t.unitId?.unitNumber ?? "—"}`,
            selected: false,
            amount: "",
          })),
        );
      } catch (err) {
        if (!cancelled)
          setTenantsError(
            err.message || "We couldn't load tenants for this building.",
          );
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const selectedTenants = useMemo(
    () => tenantRows.filter((t) => t.selected),
    [tenantRows],
  );
  const totalAmount = useMemo(
    () => selectedTenants.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    [selectedTenants],
  );
  const allSelected =
    tenantRows.length > 0 && selectedTenants.length === tenantRows.length;

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setSubmitError(null);
  };

  const toggleTenant = (id) => {
    setTenantRows((rows) =>
      rows.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)),
    );
  };

  const toggleSelectAll = () => {
    const next = !allSelected;
    setTenantRows((rows) => rows.map((t) => ({ ...t, selected: next })));
  };

  const updateTenantAmount = (id, amount) => {
    setTenantRows((rows) =>
      rows.map((t) => (t.id === id ? { ...t, amount } : t)),
    );
  };

  const applyDefaultAmount = () => {
    if (!bulkForm.defaultAmount) return;
    setTenantRows((rows) =>
      rows.map((t) =>
        t.selected ? { ...t, amount: bulkForm.defaultAmount } : t,
      ),
    );
  };

  const validateSingle = () => {
    const next = {};
    if (!singleForm.tenantId) next.tenantId = "Select a tenant.";
    if (!singleForm.type) next.type = "Select a bill type.";
    if (!singleForm.amount || Number(singleForm.amount) <= 0)
      next.amount = "Enter a valid amount.";
    if (!singleForm.dueDate) next.dueDate = "Due date is required.";
    else if (singleForm.dueDate < todayISO())
      next.dueDate = "Due date cannot be in the past.";
    else if (singleForm.dueDate > maxDueDateISO())
      next.dueDate = `Due date cannot be more than ${MAX_DUE_DATE_DAYS_AHEAD} days from now.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateBulk = () => {
    const next = {};
    if (!bulkForm.type) next.type = "Select a bill type.";
    if (!bulkForm.dueDate) next.dueDate = "Due date is required.";
    else if (bulkForm.dueDate < todayISO())
      next.dueDate = "Due date cannot be in the past.";
    else if (bulkForm.dueDate > maxDueDateISO())
      next.dueDate = `Due date cannot be more than ${MAX_DUE_DATE_DAYS_AHEAD} days from now.`;
    if (selectedTenants.length === 0)
      next.tenants = "Select at least one tenant.";

    const tenantErrors = {};
    selectedTenants.forEach((t) => {
      if (!t.amount || Number(t.amount) <= 0)
        tenantErrors[t.id] = "Enter a valid amount.";
    });
    if (Object.keys(tenantErrors).length > 0) {
      next.tenants = "Fix the highlighted amounts.";
      next.tenantErrors = tenantErrors;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const isValid = mode === "single" ? validateSingle() : validateBulk();
    if (!isValid) return;

    setSubmitting(true);
    try {
      if (mode === "single") {
        await createBill({
          tenantId: singleForm.tenantId,
          type: singleForm.type,
          amount: Number(singleForm.amount),
          dueDate: singleForm.dueDate,
          notes: singleForm.notes.trim() || undefined,
        });
        setSuccess("Bill posted successfully. Redirecting…");
      } else {
        const payload = selectedTenants.map((t) => ({
          tenantId: t.id,
          type: bulkForm.type,
          amount: Number(t.amount),
          dueDate: bulkForm.dueDate,
          notes: bulkForm.notes.trim() || undefined,
        }));
        await createBillsBulk(payload);
        setSuccess(
          `${payload.length} bill${payload.length === 1 ? "" : "s"} posted successfully. Redirecting…`,
        );
      }
      setTimeout(() => navigate("/caretaker/bills"), 900);
    } catch (err) {
      setSubmitError(err.message || "We couldn't post this bill. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/caretaker/bills")}
          aria-label="Back to bills"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
        >
          <LuArrowLeft />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Post Bill</h2>
          <p className="text-sm text-slate-500 mt-1">
            Charge one tenant, or post the same bill type to several at once.
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-800">
          <LuCircleCheck
            className="text-emerald-500 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p>{success}</p>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <Field label="Building" required>
        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          disabled={buildingsLoading}
          className={inputClasses}
        >
          <option value="">
            {buildingsLoading ? "Loading buildings…" : "Select a building"}
          </option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <ModeToggle
        mode={mode}
        onChange={handleModeChange}
        disabled={submitting}
      />

      <Card className="p-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          {mode === "single" ? (
            <>
              <Field
                label="Tenant"
                required
                error={errors.tenantId || tenantsError}
              >
                {tenantsLoading ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-400">
                    <LuLoaderCircle
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Loading tenants…
                  </div>
                ) : (
                  <select
                    value={singleForm.tenantId}
                    onChange={setSingleField("tenantId")}
                    disabled={!buildingId || tenants.length === 0}
                    className={inputClasses}
                  >
                    <option value="">
                      {!buildingId
                        ? "Select a building first"
                        : tenants.length === 0
                          ? "No active tenants"
                          : "Select a tenant"}
                    </option>
                    {tenants.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.userId?.name ?? "Unknown"} — Unit{" "}
                        {t.unitId?.unitNumber ?? "—"}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Bill Type" required error={errors.type}>
                  <select
                    value={singleForm.type}
                    onChange={setSingleField("type")}
                    className={inputClasses}
                  >
                    <option value="">Select a type</option>
                    {BILL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount (KES)" required error={errors.amount}>
                  <input
                    type="number"
                    min="0"
                    value={singleForm.amount}
                    onChange={setSingleField("amount")}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="25000"
                    className={inputClasses}
                  />
                </Field>
              </div>

              <Field label="Due Date" required error={errors.dueDate}>
                <input
                  type="date"
                  min={todayISO()}
                  max={maxDueDateISO()}
                  value={singleForm.dueDate}
                  onChange={setSingleField("dueDate")}
                  className={inputClasses}
                />
              </Field>

              <Field label="Notes (optional)">
                <textarea
                  rows={3}
                  value={singleForm.notes}
                  onChange={setSingleField("notes")}
                  placeholder="Any extra detail for this bill…"
                  className={`${inputClasses} resize-none`}
                />
              </Field>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Bill Type" required error={errors.type}>
                  <select
                    value={bulkForm.type}
                    onChange={setBulkField("type")}
                    className={inputClasses}
                  >
                    <option value="">Select a type</option>
                    {BILL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Due Date" required error={errors.dueDate}>
                  <input
                    type="date"
                    min={todayISO()}
                    max={maxDueDateISO()}
                    value={bulkForm.dueDate}
                    onChange={setBulkField("dueDate")}
                    className={inputClasses}
                  />
                </Field>
                <Field label="Default Amount (KES)">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={bulkForm.defaultAmount}
                      onChange={setBulkField("defaultAmount")}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="e.g. 1500"
                      className={inputClasses}
                    />
                    <button
                      type="button"
                      onClick={applyDefaultAmount}
                      disabled={!bulkForm.defaultAmount}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-canvas text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                </Field>
              </div>

              <Field label="Notes (optional)">
                <textarea
                  rows={2}
                  value={bulkForm.notes}
                  onChange={setBulkField("notes")}
                  placeholder="Any extra detail — applies to all bills in this batch…"
                  className={`${inputClasses} resize-none`}
                />
              </Field>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={labelClasses}>
                    Tenants <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={tenantRows.length === 0}
                    className="text-xs font-semibold text-brand-700 hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
                  {tenantsLoading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-400">
                      <LuLoaderCircle
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Loading tenants…
                    </div>
                  ) : tenantRows.length === 0 ? (
                    <p className="text-sm text-slate-400 px-4 py-6 text-center">
                      {!buildingId
                        ? "Select a building first."
                        : "No active tenants found."}
                    </p>
                  ) : (
                    tenantRows.map((tenant) => (
                      <TenantRow
                        key={tenant.id}
                        tenant={tenant}
                        error={errors.tenantErrors?.[tenant.id]}
                        onToggle={toggleTenant}
                        onAmountChange={updateTenantAmount}
                      />
                    ))
                  )}
                </div>
                {errors.tenants && (
                  <p className="text-red-500 text-xs">{errors.tenants}</p>
                )}
              </div>

              {selectedTenants.length > 0 && (
                <div className="flex items-center justify-between bg-canvas rounded-xl px-4 py-3 text-sm">
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {selectedTenants.length}
                    </span>{" "}
                    tenant
                    {selectedTenants.length === 1 ? "" : "s"} selected
                  </span>
                  <span className="font-semibold text-slate-900">
                    Total: KES {totalAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/caretaker/bills")}
              disabled={submitting}
              className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-canvas text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              {submitting
                ? "Posting…"
                : mode === "single"
                  ? "Post Bill"
                  : `Post ${selectedTenants.length || ""} Bill${selectedTenants.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddBills;