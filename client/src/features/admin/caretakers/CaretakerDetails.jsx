import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuPhone,
  LuMail,
  LuBuilding2,
  LuPlus,
  LuPencil,
  LuPower,
  LuLoaderCircle,
  LuSmartphone,
  LuKeyRound,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import AssignCaretaker from './AssignCaretaker.jsx';
import ChangePhoneModal from '../components/ChangePhoneModal.jsx';
import ResetPasswordModal from '../components/ResetPasswordModal.jsx';
import { getCaretaker, updateCaretaker } from '../../../services/caretaker.service.js';
import { listBuildings } from '../../../services/building.service.js';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-500';

const CaretakerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caretaker, setCaretaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', email: '' });
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ caretaker: res }, { buildings: allBuildings }] = await Promise.all([
          getCaretaker(id),
          listBuildings({ page: 1, limit: 100 }),
        ]);
        const nameById = new Map(allBuildings.map((b) => [b.id, b.name]));
        const withBuildingNames = {
          ...res,
          buildings: (res.buildingIds ?? []).map((bid) => ({ id: bid, name: nameById.get(bid) ?? 'Unknown building' })),
        };
        if (!cancelled) setCaretaker(withBuildingNames);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load this caretaker. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const buildings = useMemo(
    () => (caretaker && Array.isArray(caretaker.buildings) ? caretaker.buildings : []),
    [caretaker]
  );

  const handleBuildingAssigned = (updated) => {
    setCaretaker(updated);
    setShowAssignModal(false);
  };

  const handleToggleActive = async () => {
    setStatusUpdating(true);
    try {
      const { caretaker: updated } = await updateCaretaker(caretaker.id, { isActive: !caretaker.isActive });
      setCaretaker((prev) => ({ ...prev, ...updated }));
    } finally {
      setStatusUpdating(false);
    }
  };

  const startEditing = () => {
    setEditValues({ name: caretaker.name, email: caretaker.email ?? '' });
    setEditErrors({});
    setEditError(null);
    setIsEditing(true);
  };

  const validateEdit = () => {
    const next = {};
    if (!editValues.name.trim()) next.name = 'Name is required.';
    if (editValues.email.trim() && !/^\S+@\S+\.\S+$/.test(editValues.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    setEditErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError(null);
    if (!validateEdit()) return;

    setSavingEdit(true);
    try {
      const { caretaker: updated } = await updateCaretaker(caretaker.id, {
        name: editValues.name.trim(),
        email: editValues.email.trim() || undefined,
      });
      setCaretaker((prev) => ({ ...prev, ...updated }));
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message || "We couldn't save these changes. Try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePhoneChanged = (newPhone) => {
    setCaretaker((prev) => ({ ...prev, phone: newPhone }));
    setShowPhoneModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/admin/caretakers')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-700 transition-colors w-fit cursor-pointer"
      >
        <LuArrowLeft aria-hidden="true" />
        Back to Caretakers
      </button>

      {loading && <Loader label="Loading caretaker…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && caretaker && (
        <>
          <Card className="p-6">
            {!isEditing ? (
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-lg font-bold">
                    {getInitials(caretaker.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-slate-900">{caretaker.name}</h2>
                      <Badge tone={caretaker.isActive ? 'success' : 'neutral'}>
                        {caretaker.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <LuPhone className="text-xs shrink-0" aria-hidden="true" />
                      {caretaker.phone}
                    </p>
                    {caretaker.email && (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <LuMail className="text-xs shrink-0" aria-hidden="true" />
                        {caretaker.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200
                               text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <LuSmartphone aria-hidden="true" />
                    Change Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200
                               text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <LuKeyRound aria-hidden="true" />
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={startEditing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200
                               text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <LuPencil aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleActive}
                    disabled={statusUpdating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200
                               text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {statusUpdating ? (
                      <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                      <LuPower aria-hidden="true" />
                    )}
                    {caretaker.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                {editError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {editError}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-name" className={labelClasses}>
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                      className={inputClasses}
                    />
                    {editErrors.name && <p className="text-red-500 text-xs">{editErrors.name}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-phone" className={labelClasses}>
                      Phone Number{' '}
                      <span className="text-slate-400 normal-case font-normal">(use "Change Phone")</span>
                    </label>
                    <input
                      id="edit-phone"
                      type="tel"
                      value={caretaker.phone}
                      disabled
                      className={`${inputClasses} bg-canvas cursor-not-allowed`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label htmlFor="edit-email" className={labelClasses}>
                      Email <span className="text-slate-400 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      value={editValues.email}
                      onChange={(e) => setEditValues((v) => ({ ...v, email: e.target.value }))}
                      className={inputClasses}
                    />
                    {editErrors.email && <p className="text-red-500 text-xs">{editErrors.email}</p>}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={savingEdit}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50
                               text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800
                               text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingEdit && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </Card>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assigned Buildings</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {buildings.length} building{buildings.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800
                           text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <LuPlus aria-hidden="true" />
                Assign to Building
              </button>
            </div>

            {buildings.length === 0 ? (
              <Card className="p-0">
                <EmptyState
                  icon={LuBuilding2}
                  title="Not assigned to a building yet"
                  description="Assign this caretaker to a building so they can start managing units and tenants."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(true)}
                      className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                                 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <LuPlus aria-hidden="true" />
                      Assign to Building
                    </button>
                  }
                />
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {buildings.map((b) => (
                  <Card key={b.id} className="p-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                      <LuBuilding2 aria-hidden="true" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{b.name}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showAssignModal && caretaker && (
        <AssignCaretaker caretaker={caretaker} onClose={() => setShowAssignModal(false)} onSaved={handleBuildingAssigned} />
      )}

      {showPhoneModal && caretaker && (
        <ChangePhoneModal person={caretaker} onClose={() => setShowPhoneModal(false)} onSaved={handlePhoneChanged} />
      )}

      {showResetPasswordModal && caretaker && (
        <ResetPasswordModal person={caretaker} onClose={() => setShowResetPasswordModal(false)} />
      )}
    </div>
  );
};

export default CaretakerDetails;
