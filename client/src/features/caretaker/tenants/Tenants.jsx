import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuSearch, LuUserPlus, LuUserRound, LuChevronRight, LuMessageCircle } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { formatCurrency, formatDate } from '../../../components/constast/Constasts.js';
import { getBuildings } from '../../../services/building.service.js';
import { getTenants } from '../../../services/tenant.service.js';
import InviteTenantModal from './InviteTenantModal.jsx';

const STATUS_TONE = { active: 'success', pending: 'warning', moved_out: 'default' };
const STATUS_LABEL = { active: 'Active', pending: 'Pending', moved_out: 'Moved Out' };

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const Tenants = () => {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

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
    if (!buildingId) {
      setTenants([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { tenants: list } = await getTenants(buildingId, { page: 1, limit: 100 });
        if (!cancelled) setTenants(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load your tenants. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const filteredTenants = useMemo(() => {
    const list = Array.isArray(tenants) ? tenants : [];
    const term = search.trim().toLowerCase();
    return list.filter((t) => {
      const name = t.userId?.name?.toLowerCase() ?? '';
      const unit = t.unitId?.unitNumber?.toLowerCase() ?? '';
      const matchesTerm = !term || name.includes(term) || unit.includes(term);
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [tenants, search, statusFilter]);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Tenant', render: (r) => r.userId?.name ?? '—' },
      { key: 'unit', label: 'Unit', render: (r) => r.unitId?.unitNumber ?? '—' },
      { key: 'phone', label: 'Phone', render: (r) => r.userId?.phone ?? '—' },
      {
        key: 'monthlyRent',
        label: 'Rent',
        render: (r) => (r.unitId?.rentAmount != null ? formatCurrency(r.unitId.rentAmount) : '—'),
      },
      { key: 'moveInDate', label: 'Move-in', render: (r) => (r.moveInDate ? formatDate(r.moveInDate) : '—') },
      {
        key: 'status',
        label: 'Status',
        render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'default'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>,
      },
      {
        key: 'actions',
        label: '',
        render: (r) => (
          <button
            type="button"
            onClick={() => navigate(`/caretaker/tenants/${r.id}`)}
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

  const hasData = !loading && !error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenants</h2>
          <p className="text-sm text-slate-500 mt-1">Everyone renting in your assigned buildings.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            disabled={buildings.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuMessageCircle aria-hidden="true" />
            Invite via WhatsApp
          </button>
          <button
            type="button"
            onClick={() => navigate('/caretaker/tenants/add')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <LuUserPlus aria-hidden="true" />
            Add Tenant
          </button>
        </div>
      </div>

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
            placeholder="Search by name or unit…"
            aria-label="Search tenants"
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
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {(loading || buildingsLoading) && <Loader label="Loading tenants…" />}

      {!loading && !buildingsLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!buildingsLoading && buildings.length === 0 && !error && (
        <Card className="p-0">
          <EmptyState
            icon={LuUserRound}
            title="No assigned buildings"
            description="You haven't been assigned to any building yet."
          />
        </Card>
      )}

      {hasData && !buildingsLoading && buildings.length > 0 && filteredTenants.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuUserRound}
            title="No tenants found"
            description={
              search || statusFilter !== 'all'
                ? 'Try a different search term or filter.'
                : 'Tenants you add will show up here.'
            }
          />
        </Card>
      )}

      {hasData && filteredTenants.length > 0 && (
        <Card className="p-0">
          <Table columns={columns} data={filteredTenants} keyField="_id" />
        </Card>
      )}

      {inviteModalOpen && (
        <InviteTenantModal onClose={() => setInviteModalOpen(false)} assignedBuildings={buildings} />
      )}
    </div>
  );
};

export default Tenants;