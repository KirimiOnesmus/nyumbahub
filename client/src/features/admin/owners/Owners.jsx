import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuSearch, LuBuilding2, LuPhone, LuChevronRight } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import AddOwner from './AddOwner.jsx';
import { listOwners } from '../../../services/owner.service.js';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const OwnerCard = ({ owner, onOpen }) => (
  <Card
    as="button"
    type="button"
    onClick={() => onOpen(owner.id)}
    className="p-5 text-left hover:border-brand-700 transition-colors flex flex-col gap-4 hover:cursor-pointer"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-sm font-bold">
        {getInitials(owner.name)}
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={owner.isActive ? 'success' : 'neutral'}>{owner.isActive ? 'Active' : 'Inactive'}</Badge>
        <LuChevronRight className="text-slate-300 shrink-0" aria-hidden="true" />
      </div>
    </div>

    <div>
      <h3 className="font-bold text-slate-900">{owner.name}</h3>
      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
        <LuPhone className="text-xs shrink-0" aria-hidden="true" />
        {owner.phone}
      </p>
    </div>

    <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
      <LuBuilding2 className="text-slate-400 shrink-0" aria-hidden="true" />
      {owner.buildingCount ?? 0} building{(owner.buildingCount ?? 0) === 1 ? '' : 's'}
    </div>
  </Card>
);

const Owners = () => {
  const navigate = useNavigate();
  const [owners, setOwners] = useState([]);
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
        const res = await listOwners({ page: 1, limit: 100 });
        if (!cancelled) setOwners(Array.isArray(res.owners) ? res.owners : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load owners. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOwners = useMemo(() => {
    if (!Array.isArray(owners)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        (o.email ?? '').toLowerCase().includes(q)
    );
  }, [owners, search]);

  const handleCreated = (owner) => {
    setOwners((prev) => [owner, ...prev]);
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Owners</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading owners…' : `${filteredOwners.length} owner${filteredOwners.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
           hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <LuPlus aria-hidden="true" />
          Add Owner
        </button>
      </div>

      <label className="relative w-full md:max-w-sm">
        <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search owners…"
          aria-label="Search owners"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
        />
      </label>

      {loading && <Loader label="Loading owners…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && filteredOwners.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuBuilding2}
            title={search ? 'No owners match your search' : 'No owners yet'}
            description={search ? 'Try a different name, phone number, or email.' : 'Add an owner to get them onto the platform.'}
            action={
              !search && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                   hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LuPlus aria-hidden="true" />
                  Add Owner
                </button>
              )
            }
          />
        </Card>
      )}

      {!loading && !error && filteredOwners.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOwners.map((owner) => (
            <OwnerCard key={owner.id} owner={owner} onOpen={(id) => navigate(`/admin/owners/${id}`)} />
          ))}
        </div>
      )}

      {showAddModal && <AddOwner onClose={() => setShowAddModal(false)} onSaved={handleCreated} />}
    </div>
  );
};

export default Owners;
