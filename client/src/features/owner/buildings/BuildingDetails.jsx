import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  LuArrowLeft,
  LuMapPin,
  LuDoorOpen,
  LuUsers,
  LuWallet,
  LuPencil,
  LuTrash2,
  LuPlus,
  LuLayers,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import Table from '../../../components/common/Table.jsx';
import { UNIT_TYPE_LABELS } from '../../../components/constast/Constasts.js';
import { getBuilding } from '../../../services/building.service.js';
import { getUnits } from '../../../services/unit.service.js';

const currency = (value) => `KES ${value.toLocaleString('en-KE')}`;

const STATUS_TONE = { occupied: 'success', vacant: 'neutral' };

const StatCard = ({ icon: Icon, label, value }) => (
  <Card className="p-5">
    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
      <Icon className="text-brand-700 text-lg" aria-hidden="true" />
    </div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
  </Card>
);

// Mongo ObjectIds are 24 hex chars. This is a cheap client-side sanity
// check only — the server is still the real authority and will reject
// anything malformed with its own CastError handling — but it lets us
// fail fast with a clear message instead of firing a request we already
// know is broken (e.g. a stale/corrupted `id` from an earlier bug).
const isValidObjectId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

const BuildingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isValidObjectId(id)) {
        setLoading(false);
        setError('This building link looks invalid or out of date.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [buildingRes, unitsRes] = await Promise.all([
          getBuilding(id),
          getUnits(id, { page: 1, limit: 100 }),
        ]);
        if (!cancelled) {
          setBuilding(buildingRes.building);
          setUnits(unitsRes.units);
        }
      } catch (err) {
        const message = err.message || 'We couldn\u2019t load this building. Try again.';
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
  }, [id]);
 

  const unitTypeSummary = building?.unitTypes ?? [];

  const unitColumns = [
    { key: 'unitNumber', label: 'Unit' },
    {
      key: 'type',
      label: 'Type',
      render: (row) => UNIT_TYPE_LABELS[row.type] ?? row.type ?? '—',
    },
  { key: 'rentAmount', label: 'Rent', align: 'right', render: (row) => currency(row.rentAmount) },
    {
      key: 'status',
      label: 'Status',
      align: 'right',
      render: (row) => (
        <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/owner/buildings')}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 
        hover:text-brand-700 transition-colors w-fit hover:cursor-pointer"
      >
        <LuArrowLeft aria-hidden="true" />
        Back to Buildings
      </button>

      {loading && <Loader label="Loading building…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && building && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{building.name}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <LuMapPin className="text-xs shrink-0" aria-hidden="true" />
                {building.address}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border
                 border-slate-200 text-slate-700 hover:bg-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <LuPencil aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border
                 border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors cursor-pointer"
              >
                <LuTrash2 aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={LuDoorOpen} label="Total Units" value={building.totalUnits} />
            <StatCard
              icon={LuDoorOpen}
              label="Occupied"
              value={`${building.occupiedUnits}/${building.totalUnits}`}
            />
            <StatCard icon={LuWallet} label="Monthly Revenue" value={currency(building.revenue)} />
            <StatCard icon={LuUsers} label="Caretakers" value={building.caretakers} />
          </div>

          {unitTypeSummary.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <LuLayers className="text-brand-700" aria-hidden="true" />
                <h3 className="font-bold text-slate-900">Unit Type Breakdown</h3>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitTypeSummary.map((entry) => (
                  <div
                    key={entry.type}
                    className="rounded-xl border border-slate-200 px-4 py-3.5 flex flex-col gap-1"
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      {UNIT_TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {entry.quantity} unit{entry.quantity === 1 ? '' : 's'}
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1">
                      {currency(entry.rentAmount)}
                      <span className="text-xs font-medium text-slate-400"> / unit</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Units</h3>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-canvas text-sm font-semibold transition-colors cursor-pointer "
              >
                <LuPlus aria-hidden="true" />
                Add Unit
              </button>
            </div>
            {units.length === 0 ? (
              <EmptyState
                icon={LuDoorOpen}
                title="No units yet"
                description="Add a unit to start onboarding tenants."
              />
            ) : (
              <Table columns={unitColumns} data={units} keyField="id" />
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-900 mb-4">Caretakers</h3>
            {building.caretakers === 0 ? (
              <EmptyState
                icon={LuUsers}
                title="No caretakers assigned"
                description="Assign a caretaker to manage this building day to day."
              />
            ) : (
              // The backend only returns a caretaker COUNT for a building
              // (no names) — there's no endpoint to list caretakers filtered
              // to one building. See /owner/caretakers for the full roster.
              <p className="text-sm text-slate-600">
                {building.caretakers} caretaker{building.caretakers === 1 ? '' : 's'} assigned.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/owner/caretakers')}
                  className="font-semibold text-brand-700 hover:underline cursor-pointer"
                >
                  View all caretakers
                </button>
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default BuildingDetails;