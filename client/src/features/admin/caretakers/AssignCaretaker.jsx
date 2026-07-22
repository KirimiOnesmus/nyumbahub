import { useEffect, useMemo, useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createCaretaker, assignCaretakerToBuilding } from '../../../services/caretaker.service.js';
import { listBuildings } from '../../../services/building.service.js';

const PHONE_REGEX = /^\+254(7|1)\d{8}$/;

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-500';


const AssignCaretaker = ({ caretaker = null, onClose, onSaved }) => {
  const isAssignMode = Boolean(caretaker);

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState([]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [pendingCaretaker, setPendingCaretaker] = useState(null);
  const [createdTempPassword, setCreatedTempPassword] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadBuildings = async () => {
      setBuildingsLoading(true);
      try {
        const res = await listBuildings({ page: 1, limit: 100 });
        if (!cancelled) setBuildings(res.buildings);
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };

    loadBuildings();
    return () => {
      cancelled = true;
    };
  }, []);

  const alreadyAssignedIds = useMemo(
    () => new Set((caretaker?.buildings ?? []).map((b) => b.id)),
    [caretaker]
  );

  const assignableBuildings = useMemo(
    () => (Array.isArray(buildings) ? buildings.filter((b) => !alreadyAssignedIds.has(b.id)) : []),
    [buildings, alreadyAssignedIds]
  );

  const toggleBuilding = (id) => {
    setSelectedBuildingIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const validate = () => {
    const next = {};
    if (!isAssignMode) {
      if (!name.trim()) next.name = 'Name is required.';
      if (!phone.trim()) next.phone = 'Phone number is required.';
      else if (!PHONE_REGEX.test(phone.trim())) next.phone = 'Enter a valid Kenyan number, e.g. +254712345678.';
      if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    }
    if (selectedBuildingIds.length === 0) {
      next.buildings = 'Select at least one building.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const assignedBuildings = buildings.filter((b) => selectedBuildingIds.includes(b.id));

      if (isAssignMode) {
        for (const buildingId of selectedBuildingIds) {
          await assignCaretakerToBuilding(caretaker.id, buildingId);
        }
        onSaved({ ...caretaker, buildings: [...caretaker.buildings, ...assignedBuildings] });
      } else {
        const { caretaker: created, tempPassword } = await createCaretaker({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          buildingIds: selectedBuildingIds,
        });
        setPendingCaretaker({ ...created, buildings: assignedBuildings });
        setCreatedTempPassword(tempPassword);
      }
    } catch (err) {
      setSubmitError(
        err.message ||
          (isAssignMode ? "We couldn't assign the building. Try again." : "We couldn't add the caretaker. Try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {createdTempPassword ? (
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden p-6 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-bold text-slate-900">Caretaker added</h2>
          <p className="text-sm text-slate-600">
            Share this temporary password with {pendingCaretaker?.name} through a secure, out-of-band channel
            (SMS or WhatsApp call, not email). It won't be shown again.
          </p>
          <div className="bg-canvas border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-900 select-all">
            {createdTempPassword}
          </div>
          <button
            type="button"
            onClick={() => onSaved(pendingCaretaker)}
            className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <h2 className="font-bold text-slate-900">
              {isAssignMode ? `Assign ${caretaker.name} to a building` : 'Add Caretaker'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <LuX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              {!isAssignMode && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ct-name" className={labelClasses}>
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="ct-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Peter Otieno"
                      className={inputClasses}
                    />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ct-phone" className={labelClasses}>
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="ct-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254712345678"
                      className={inputClasses}
                    />
                    {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ct-email" className={labelClasses}>
                      Email <span className="text-slate-400 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      id="ct-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="peter.otieno@example.com"
                      className={inputClasses}
                    />
                    {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={labelClasses}>
                  {isAssignMode ? 'Building' : 'Assign to Building(s)'} <span className="text-red-400">*</span>
                </label>

                {buildingsLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                    Loading buildings…
                  </div>
                )}

                {!buildingsLoading && assignableBuildings.length === 0 && (
                  <p className="text-sm text-slate-500 py-1">
                    {isAssignMode ? 'Already assigned to every building.' : 'No buildings exist yet — an owner needs to add one first.'}
                  </p>
                )}

                {!buildingsLoading && assignableBuildings.length > 0 && (
                  <div className="flex flex-col gap-2 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                    {assignableBuildings.map((b) => (
                      <label key={b.id} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBuildingIds.includes(b.id)}
                          onChange={() => toggleBuilding(b.id)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-700 focus:ring-brand-700/20"
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                )}
                {errors.buildings && <p className="text-red-500 text-xs">{errors.buildings}</p>}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-1 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50
                           text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                           hover:bg-brand-800 text-white text-sm font-semibold transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
                {isAssignMode ? 'Assign Building' : 'Add Caretaker'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AssignCaretaker;
