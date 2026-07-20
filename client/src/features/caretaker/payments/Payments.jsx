import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuSearch, LuCirclePlus, LuWallet, LuChevronRight } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Shell from '../../../components/common/Shell.jsx';
import { formatCurrency, formatDate } from '../../../components/constast/Constasts.js';
import { getBuildings } from '../../../services/building.service.js';
import { getBuildingPayments } from '../../../services/payment.service.js';

// GET /buildings/:buildingId/payments only ever returns the most recent
// COMPLETED M-Pesa payments for a building, capped at 20 by the backend's
// validator (utils/validators/payment.validators.js). There is no
// pagination cursor and no cross-building aggregate — so unlike Bills,
// this list is deliberately a bounded "recent activity" view, not a full
// payment ledger. Manual (cash/bank) settlements aren't recorded here at
// all: they're reconciled directly on a bill via mark-paid and never
// become a Payment document (see AddPayments.jsx).
const RECENT_PAYMENTS_LIMIT = 20;

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const Payments = () => {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
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
    if (!buildingId) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getBuildingPayments(buildingId, RECENT_PAYMENTS_LIMIT);
        if (!cancelled) setPayments(Array.isArray(res.payments) ? res.payments : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load your payments. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const filteredPayments = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => {
      const tenantName = p.tenantName?.toLowerCase() ?? '';
      const unit = p.unitNumber?.toLowerCase() ?? '';
      return tenantName.includes(term) || unit.includes(term);
    });
  }, [payments, search]);

  const effectiveLoading = buildingsLoading || (Boolean(buildingId) && loading);

  const totalCollected = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    return list.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }, [payments]);

  const columns = useMemo(
    () => [
      { key: 'tenantName', label: 'Tenant', render: (r) => r.tenantName ?? '—' },
      { key: 'unitNumber', label: 'Unit', render: (r) => r.unitNumber ?? '—' },
      { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
      { key: 'method', label: 'Method', render: (r) => <Badge tone="success">{r.method}</Badge> },
      { key: 'paidOn', label: 'Paid On', render: (r) => formatDate(r.paidOn) },
      {
        key: 'actions',
        label: '',
        render: (r) => (
          <button
            type="button"
            onClick={() => navigate(`/caretaker/payments/${r.id}`, { state: { payment: r } })}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer"
          >
            View
            <LuChevronRight aria-hidden="true" />
          </button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
          <p className="text-sm text-slate-500 mt-1">
            The {RECENT_PAYMENTS_LIMIT} most recent M-Pesa payments for this building.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/caretaker/payments/add')}
          disabled={buildings.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LuCirclePlus aria-hidden="true" />
          Record Payment
        </button>
      </div>

      {!effectiveLoading && !error && payments.length > 0 && (
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <LuWallet aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Collected (shown above)
            </p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(totalCollected)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Sum of the {payments.length} payment{payments.length === 1 ? '' : 's'} listed — not an all-time total.
            </p>
          </div>
        </Card>
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
          {!buildingsLoading && buildings.length === 0 && <option>No assigned buildings</option>}
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="relative flex-1 max-w-sm">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tenant or unit…"
            aria-label="Search payments"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
          />
        </label>
      </div>

      <Shell
        loading={effectiveLoading}
        error={error}
        isEmpty={filteredPayments.length === 0}
        loadingLabel="Loading payments…"
        emptyIcon={LuWallet}
        emptyTitle={buildings.length === 0 ? 'No assigned buildings' : 'No payments found'}
        emptyDescription={
          buildings.length === 0
            ? "You haven't been assigned to any building yet."
            : search
              ? 'Try a different search term.'
              : 'Completed M-Pesa payments will show up here.'
        }
      >
        <Card className="p-0">
          <Table columns={columns} data={filteredPayments} keyField="id" />
        </Card>
      </Shell>
    </div>
  );
};

export default Payments;