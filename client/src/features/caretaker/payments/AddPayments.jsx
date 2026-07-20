import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { formatCurrency, formatDate } from '../../../components/constast/Constasts.js';
import { getBuildings } from '../../../services/building.service.js';
import { getBills, getBill, markBillPaid } from '../../../services/bill.service.js';

const BILL_TYPE_LABELS = {
  rent: 'Rent',
  water: 'Water',
  electricity: 'Electricity',
  garbage: 'Garbage',
  serviceCharge: 'Service Charge',
  other: 'Other',
};

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-400';

const todayStr = () => new Date().toISOString().slice(0, 10);

const Field = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelClasses}>
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);


const AddPayments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedBillId = location.state?.billId ?? '';

 
  const [preselectedBill, setPreselectedBill] = useState(null);
  const [preselectedLoading, setPreselectedLoading] = useState(Boolean(preselectedBillId));
  const [preselectedError, setPreselectedError] = useState(null);

  useEffect(() => {
    if (!preselectedBillId) return undefined;
    let cancelled = false;
    const load = async () => {
      setPreselectedLoading(true);
      setPreselectedError(null);
      try {
        const bill = await getBill(preselectedBillId);
        if (!cancelled) setPreselectedBill(bill);
      } catch (err) {
        if (!cancelled) setPreselectedError(err.message || "We couldn't load this bill.");
      } finally {
        if (!cancelled) setPreselectedLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [preselectedBillId]);

  // ---- Building + outstanding-bill pickers (manual entry path) ----
  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(!preselectedBillId);
  const [buildingId, setBuildingId] = useState('');

  const [outstandingBills, setOutstandingBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState(null);
  const [billId, setBillId] = useState('');

  useEffect(() => {
    if (preselectedBillId) return undefined;
    let cancelled = false;
    const load = async () => {
      setBuildingsLoading(true);
      try {
        const { buildings: list } = await getBuildings({ page: 1, limit: 100 });
        if (cancelled) return;
        const safeList = Array.isArray(list) ? list : [];
        setBuildings(safeList);
        setBuildingId((current) => current || safeList[0]?.id || '');
      } catch (err) {
        if (!cancelled) setBillsError(err.message || "We couldn't load your buildings.");
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [preselectedBillId]);

  useEffect(() => {
    if (preselectedBillId || !buildingId) return undefined;
    let cancelled = false;
    const load = async () => {
      setBillsLoading(true);
      setBillsError(null);
      try {
        const [unpaid, partial] = await Promise.all([
          getBills(buildingId, { status: 'unpaid', page: 1, limit: 100 }),
          getBills(buildingId, { status: 'partial', page: 1, limit: 100 }),
        ]);
        if (cancelled) return;
        const merged = [...(unpaid.items ?? []), ...(partial.items ?? [])].sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
        );
        setOutstandingBills(merged);
        setBillId('');
      } catch (err) {
        if (!cancelled) setBillsError(err.message || "We couldn't load outstanding bills. Try again.");
      } finally {
        if (!cancelled) setBillsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId, preselectedBillId]);

  const selectedBill = useMemo(() => {
    if (preselectedBill) return preselectedBill;
    return outstandingBills.find((b) => b.id === billId) ?? null;
  }, [preselectedBill, outstandingBills, billId]);

  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(todayStr());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const next = {};
    if (!selectedBill) next.bill = 'Select a bill to settle.';
    const numericAmount = Number(amount);
    if (!amount || numericAmount <= 0) {
      next.amount = 'Enter a valid amount.';
    } else if (selectedBill && numericAmount > selectedBill.balance) {
      next.amount = `Amount can't exceed the outstanding balance of ${formatCurrency(selectedBill.balance)}.`;
    }
    if (paidOn && paidOn > todayStr()) next.paidOn = 'Date paid cannot be in the future.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await markBillPaid(selectedBill.id, {
        amountPaid: Number(amount),
        ...(paidOn ? { paidAt: new Date(`${paidOn}T00:00:00`).toISOString() } : {}),
      });
      setSuccess(true);
      setTimeout(() => navigate('/caretaker/bills'), 1100);
    } catch (err) {
      setSubmitError(err.message || "We couldn't record this payment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadingBillPicker = preselectedBillId ? preselectedLoading : buildingsLoading || billsLoading;

  return (
    <div className="flex flex-col gap-6 max-w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/caretaker/payments')}
          aria-label="Back to payments"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
        >
          <LuArrowLeft />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Record Payment</h2>
          <p className="text-sm text-slate-500 mt-1">Settle a tenant's outstanding bill (cash, bank transfer, etc.).</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-amber-800">
        <LuTriangleAlert className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          This records a manual settlement directly on the bill. It updates the bill's balance and status on the
          Bills page — there's no separate payment method or reference/receipt field to store, and it won't appear
          on the Payments list (that list only shows completed M-Pesa transactions).
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-800">
          <LuCircleCheck className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p>Payment recorded. Redirecting to Bills…</p>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{submitError}</div>
      )}

      {preselectedError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {preselectedError}
        </div>
      )}

      <Card className="p-6">
        {loadingBillPicker ? (
          <Loader label="Loading…" />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {!preselectedBillId && (
              <>
                <Field label="Building" required>
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    disabled={buildings.length === 0}
                    className={inputClasses}
                  >
                    {buildings.length === 0 && <option>No assigned buildings</option>}
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {billsError && <p className="text-red-500 text-xs">{billsError}</p>}

                <Field label="Bill" required error={errors.bill}>
                  <select
                    value={billId}
                    onChange={(e) => setBillId(e.target.value)}
                    disabled={outstandingBills.length === 0}
                    className={inputClasses}
                  >
                    <option value="">
                      {outstandingBills.length === 0 ? 'No outstanding bills for this building' : 'Select a bill'}
                    </option>
                    {outstandingBills.map((b) => (
                      <option key={b.id} value={b.id}>
                        {(b.tenantName ?? 'Unknown tenant')} — Unit {b.unit ?? '—'} —{' '}
                        {BILL_TYPE_LABELS[b.type] ?? b.type} (Balance: {formatCurrency(b.balance)}, due{' '}
                        {formatDate(b.dueDate)})
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            {selectedBill && (
              <Card className="p-4 bg-canvas border-none">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={labelClasses}>Tenant</p>
                    <p className="font-semibold text-slate-800">{selectedBill.tenantName ?? '—'}</p>
                  </div>
                  <div>
                    <p className={labelClasses}>Unit</p>
                    <p className="font-semibold text-slate-800">{selectedBill.unit ?? '—'}</p>
                  </div>
                  <div>
                    <p className={labelClasses}>Bill</p>
                    <p className="font-semibold text-slate-800">
                      {BILL_TYPE_LABELS[selectedBill.type] ?? selectedBill.type} — {selectedBill.period}
                    </p>
                  </div>
                  <div>
                    <p className={labelClasses}>Outstanding Balance</p>
                    <p className="font-semibold text-slate-800">{formatCurrency(selectedBill.balance)}</p>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Amount (KES)" required error={errors.amount}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="25000"
                  disabled={!selectedBill}
                  className={inputClasses}
                />
              </Field>
              <Field label="Date Paid" error={errors.paidOn}>
                <input
                  type="date"
                  value={paidOn}
                  max={todayStr()}
                  onChange={(e) => setPaidOn(e.target.value)}
                  disabled={!selectedBill}
                  className={inputClasses}
                />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/caretaker/payments')}
                disabled={submitting}
                className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-canvas text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedBill}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
                {submitting ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default AddPayments;