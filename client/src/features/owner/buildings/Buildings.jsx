import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  LuPlus,
  LuSearch,
  LuBuilding2,
  LuMapPin,
  LuDoorOpen,
  LuUsers,
  LuChevronRight,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import AddBuilding from './AddBuilding.jsx';
import { listBuildings } from '../../../services/building.service.js';

const currency = (value) => `KES ${value.toLocaleString('en-KE')}`;

const BuildingCard = ({ building, onOpen }) => {
  const occupancyPct = building.totalUnits
    ? Math.round((building.occupiedUnits / building.totalUnits) * 100)
    : 0;

  return (
    <Card
      as="button"
      type="button"
      onClick={() => onOpen(building.id)}
      className="p-5 text-left hover:border-brand-700 transition-colors flex flex-col gap-4 hover:cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <LuBuilding2 className="text-brand-700 text-lg" aria-hidden="true" />
        </div>
        <LuChevronRight className="text-slate-300 shrink-0 mt-2" aria-hidden="true" />
      </div>

      <div>
        <h3 className="font-bold text-slate-900">{building.name}</h3>
        <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
          <LuMapPin className="text-xs shrink-0" aria-hidden="true" />
          {building.address}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="flex items-center gap-1">
            <LuDoorOpen aria-hidden="true" />
            {building.occupiedUnits}/{building.totalUnits} units occupied
          </span>
          <span className="font-semibold text-slate-700">{occupancyPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full" style={{ width: `${occupancyPct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <LuUsers aria-hidden="true" />
          {building.caretakers} caretaker{building.caretakers === 1 ? '' : 's'}
        </span>
        <span className="text-sm font-bold text-slate-900">{currency(building.revenue)}</span>
      </div>
    </Card>
  );
};

const Buildings = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listBuildings({ page: 1, limit: 100 });
        if (!cancelled) setBuildings(res.buildings);
      } catch (err) {
        const message = err.message || 'We couldn\u2019t load your buildings. Try again.';
        if (!cancelled) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBuildings = useMemo(() => {
    if (!Array.isArray(buildings)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter(
      (b) => b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q)
    );
  }, [buildings, search]);

  const handleCreated = (building) => {
    setBuildings((prev) => [building, ...prev]);
    setShowAddModal(false);

    navigate('/owner/buildings', { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Buildings</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading your portfolio…' : `${filteredBuildings.length} building${filteredBuildings.length === 1 ? '' : 's'} in your portfolio`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
           hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <LuPlus aria-hidden="true" />
          Add Building
        </button>
      </div>

      <label className="relative w-full md:max-w-sm">
        <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buildings…"
          aria-label="Search buildings"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
        />
      </label>

      {loading && <Loader label="Loading your buildings…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filteredBuildings.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuBuilding2}
            title={search ? 'No buildings match your search' : 'No buildings yet'}
            description={
              search
                ? 'Try a different name or address.'
                : 'Add your first building to start tracking units, tenants, and revenue.'
            }
            action={
              !search && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                   hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LuPlus aria-hidden="true" />
                  Add Building
                </button> 
              )
            }
          />
        </Card>
      )}

      {!loading && !error && filteredBuildings.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBuildings.map((building) => (
            <BuildingCard key={building.id} building={building} onOpen={(id) => navigate(`/owner/buildings/${id}`)} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddBuilding onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
};

export default Buildings;
