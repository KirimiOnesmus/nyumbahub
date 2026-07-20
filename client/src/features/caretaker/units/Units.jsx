import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuSearch, LuCirclePlus, LuDoorOpen, LuChevronRight } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { formatCurrency } from '../../../components/constast/Constasts.js';
import { getUnits } from '../../../services/unit.service.js';
import { listBuildings } from '../../../services/building.service.js';

const STATUS_TONE = { occupied: 'success', vacant: 'warning' };


const UNIT_TYPE_LABELS = {
  single: 'Single',
  bedsitter: 'Bedsitter',
  studio: 'Studio',
  shop: 'Shop',
  oneBedroom: '1 Bedroom',
  twoBedroom: '2 Bedroom',
  threeBedroom: '3 Bedroom',
  fourBedroomPlus: '4+ Bedroom',
};

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer';

const Units = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {

        const { buildings } = await listBuildings({ page: 1, limit: 100 });
        const safeBuildings = Array.isArray(buildings) ? buildings : [];
        const perBuilding = await Promise.all(
          safeBuildings.map((b) => getUnits(b.id, { page: 1, limit: 100 }))
        );
        const flattened = perBuilding.flatMap((res, i) =>
          (Array.isArray(res.units) ? res.units : []).map((u) => ({
            ...u,
            buildingName: safeBuildings[i].name,
          }))
        );
        if (!cancelled) setUnits(flattened);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load your units. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUnits = useMemo(() => {
    const list = Array.isArray(units) ? units : [];
    const term = search.trim().toLowerCase();
    return list.filter((u) => {
      const matchesTerm =
        !term ||
        u.unitNumber?.toLowerCase().includes(term) ||
        u.buildingName?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [units, search, statusFilter]);

  const columns = useMemo(
    () => [
      { key: 'unitNumber', label: 'Unit' },
      { key: 'buildingName', label: 'Building' },
      { key: 'type', label: 'Type', render: (r) => UNIT_TYPE_LABELS[r.type] ?? r.type },
      { key: 'rentAmount', label: 'Rent', render: (r) => (r.rentAmount != null ? formatCurrency(r.rentAmount) : '—') },
      {
        key: 'status',
        label: 'Status',
        render: (r) => (
          <Badge tone={STATUS_TONE[r.status] ?? 'default'}>
            {r.status === 'occupied' ? 'Occupied' : 'Vacant'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: '',
        render: (r) => (
          <button
            type="button"
            onClick={() => navigate(`/caretaker/units/${r.id}`)}
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
          <h2 className="text-2xl font-bold text-slate-900">Units</h2>
          <p className="text-sm text-slate-500 mt-1">All units across your assigned buildings.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/caretaker/units/add')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
        >
          <LuCirclePlus aria-hidden="true" />
          Add Unit
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1 max-w-sm">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by unit, building, or tenant…"
            aria-label="Search units"
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
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
        </select>
      </div>

      {loading && <Loader label="Loading units…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {hasData && filteredUnits.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuDoorOpen}
            title="No units found"
            description={
              search || statusFilter !== 'all'
                ? 'Try a different search term or filter.'
                : 'Units you add will show up here.'
            }
          />
        </Card>
      )}

      {hasData && filteredUnits.length > 0 && (
        <Card className="p-0">
          <Table columns={columns} data={filteredUnits} keyField="id" />
        </Card>
      )}
    </div>
  );
};

export default Units;