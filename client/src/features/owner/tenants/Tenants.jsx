import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuUserPlus, LuSearch, LuUsers, LuPhone } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import InviteTenantModal from '../../caretaker/tenants/InviteTenantModal.jsx';
import { getTenants } from '../../../services/tenant.service.js';
import { listBuildings } from '../../../services/building.service.js';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const STATUS_LABELS = { pending: 'Pending', active: 'Active', moved_out: 'Moved Out' };
const STATUS_TONE = { pending: 'warning', active: 'success', moved_out: 'neutral' };

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'moved_out', label: 'Moved Out' },
];

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer';

const Tenants = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [buildingOptions, setBuildingOptions] = useState([{ id: 'all', name: 'All Buildings' }]);
  const [ownerBuildings, setOwnerBuildings] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { buildings } = await listBuildings({ page: 1, limit: 100 });
        if (!cancelled) {
          setOwnerBuildings(buildings);
          setBuildingOptions([{ id: 'all', name: 'All Buildings' }, ...buildings]);
        }
        const perBuilding = await Promise.all(
          buildings.map((b) => getTenants(b.id, { page: 1, limit: 100 }))
        );
        const flattened = perBuilding.flatMap((res, i) =>
          res.tenants.map((t) => ({
            id: t.id,
            name: t.userId?.name,
            phone: t.userId?.phone,
            email: t.userId?.email,
            building: { id: buildings[i].id, name: buildings[i].name },
            unit: { id: t.unitId?.id, houseNumber: t.unitId?.unitNumber },
            status: t.status,
            moveInDate: t.moveInDate,
          }))
        );
        if (!cancelled) setTenants(flattened);
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
  }, []);

  const filteredTenants = useMemo(() => {
    if (!Array.isArray(tenants)) return [];
    const q = search.trim().toLowerCase();

    return tenants.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q) ||
        t.unit.houseNumber.toLowerCase().includes(q) ||
        t.building.name.toLowerCase().includes(q);

      const matchesBuilding = buildingFilter === 'all' || t.building.id === buildingFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

      return matchesSearch && matchesBuilding && matchesStatus;
    });
  }, [tenants, search, buildingFilter, statusFilter]);

  const hasActiveFilters = Boolean(search) || buildingFilter !== 'all' || statusFilter !== 'all';

  const handleInvited = () => {
    setShowInviteModal(false);
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Tenant',
        render: (tenant) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-xs font-bold">
              {getInitials(tenant.name)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{tenant.name}</p>
              {tenant.email && <p className="text-xs text-slate-400">{tenant.email}</p>}
            </div>
          </div>
        ),
      },
      {
        key: 'phone',
        label: 'Phone',
        render: (tenant) => (
          <span className="flex items-center gap-1.5 text-slate-600">
            <LuPhone className="text-xs text-slate-400 shrink-0" aria-hidden="true" />
            {tenant.phone}
          </span>
        ),
      },
      {
        key: 'building',
        label: 'Building / Unit',
        render: (tenant) => (
          <span>
            {tenant.building.name} · Unit {tenant.unit.houseNumber}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (tenant) => <Badge tone={STATUS_TONE[tenant.status]}>{STATUS_LABELS[tenant.status]}</Badge>,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenants</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? 'Loading your tenants…'
              : `${filteredTenants.length} tenant${filteredTenants.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
           hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <LuUserPlus aria-hidden="true" />
          Invite Tenant
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <label className="relative w-full md:max-w-sm">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants…"
            aria-label="Search tenants"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
          />
        </label>

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          aria-label="Filter by building"
          className={selectClasses}
        >
          {buildingOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={selectClasses}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loader label="Loading your tenants…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filteredTenants.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuUsers}
            title={hasActiveFilters ? 'No tenants match your filters' : 'No tenants yet'}
            description={
              hasActiveFilters
                ? 'Try a different name, phone number, building, or status.'
                : 'Invite a tenant to a vacant unit to get started.'
            }
            action={
              !hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                   hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LuUserPlus aria-hidden="true" />
                  Invite Tenant
                </button>
              )
            }
          />
        </Card>
      )}

      {!loading && !error && filteredTenants.length > 0 && (
        <Card className="p-0">
          <Table
            columns={columns}
            data={filteredTenants}
            keyField="id"
            onRowClick={(tenant) => navigate(`/owner/tenants/${tenant.id}`)}
          />
        </Card>
      )}

      {showInviteModal && (
        <InviteTenantModal
          onClose={() => setShowInviteModal(false)}
          assignedBuildings={ownerBuildings}
        />
      )}
    </div>
  );
};

export default Tenants;