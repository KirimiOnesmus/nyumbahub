import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuSearch, LuUserCog, LuPhone, LuChevronRight } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import AssignCaretaker from './AssignCaretaker.jsx';
import { listCaretakers } from '../../../services/caretaker.service.js';
import { listBuildings } from '../../../services/building.service.js';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const CaretakerCard = ({ caretaker, onOpen }) => (
  <Card
    as="button"
    type="button"
    onClick={() => onOpen(caretaker.id)}
    className="p-5 text-left hover:border-brand-700 transition-colors flex flex-col gap-4 hover:cursor-pointer"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-sm font-bold">
        {getInitials(caretaker.name)}
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={caretaker.isActive ? 'success' : 'neutral'}>
          {caretaker.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <LuChevronRight className="text-slate-300 shrink-0" aria-hidden="true" />
      </div>
    </div>

    <div>
      <h3 className="font-bold text-slate-900">{caretaker.name}</h3>
      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
        <LuPhone className="text-xs shrink-0" aria-hidden="true" />
        {caretaker.phone}
      </p>
    </div>

    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
      {caretaker.buildings.length === 0 ? (
        <span className="text-xs font-medium text-amber-600">Not assigned to a building yet</span>
      ) : (
        caretaker.buildings.map((b) => (
          <span
            key={b.id}
            className="text-xs font-medium text-slate-600 bg-canvas border border-slate-200 rounded-full px-2.5 py-1"
          >
            {b.name}
          </span>
        ))
      )}
    </div>
  </Card>
);

const Caretakers = () => {
  const navigate = useNavigate();
  const [caretakers, setCaretakers] = useState([]);
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
        const [caretakersRes, buildingsRes] = await Promise.all([
          listCaretakers({ page: 1, limit: 100 }),
          listBuildings({ page: 1, limit: 100 }),
        ]);
        const nameById = new Map(buildingsRes.buildings.map((b) => [b.id, b.name]));
        const withBuildingNames = caretakersRes.caretakers.map((c) => ({
          ...c,
          buildings: (c.buildingIds ?? []).map((bid) => ({ id: bid, name: nameById.get(bid) ?? 'Unknown building' })),
        }));
        if (!cancelled) setCaretakers(withBuildingNames);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load caretakers. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCaretakers = useMemo(() => {
    if (!Array.isArray(caretakers)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return caretakers;
    return caretakers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        c.buildings.some((b) => b.name.toLowerCase().includes(q))
    );
  }, [caretakers, search]);

  const handleCreated = (caretaker) => {
    setCaretakers((prev) => [caretaker, ...prev]);
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Caretakers</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? 'Loading caretakers…'
              : `${filteredCaretakers.length} caretaker${filteredCaretakers.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
           hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <LuPlus aria-hidden="true" />
          Add Caretaker
        </button>
      </div>

      <label className="relative w-full md:max-w-sm">
        <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search caretakers…"
          aria-label="Search caretakers"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
        />
      </label>

      {loading && <Loader label="Loading caretakers…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && filteredCaretakers.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuUserCog}
            title={search ? 'No caretakers match your search' : 'No caretakers yet'}
            description={
              search
                ? 'Try a different name, phone number, or building.'
                : 'Add a caretaker and assign them to a building to get started.'
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
                  Add Caretaker
                </button>
              )
            }
          />
        </Card>
      )}

      {!loading && !error && filteredCaretakers.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCaretakers.map((caretaker) => (
            <CaretakerCard
              key={caretaker.id}
              caretaker={caretaker}
              onOpen={(id) => navigate(`/admin/caretakers/${id}`)}
            />
          ))}
        </div>
      )}

      {showAddModal && <AssignCaretaker onClose={() => setShowAddModal(false)} onSaved={handleCreated} />}
    </div>
  );
};

export default Caretakers;
