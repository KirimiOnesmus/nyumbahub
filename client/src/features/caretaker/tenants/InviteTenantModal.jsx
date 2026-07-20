import { useEffect, useState } from 'react';
import { LuX, LuCopy, LuCheck, LuMessageCircle, LuLink, LuLoaderCircle } from 'react-icons/lu';
import { getUnits } from '../../../services/unit.service.js';
import { createTenantInvite } from '../../../services/tenant.service.js';

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

const sanitizePhone = (value) => value.replace(/[^\d+]/g, '');

const InviteTenantModal = ({ onClose, assignedBuildings }) => {
  const [buildingId, setBuildingId] = useState(assignedBuildings.length === 1 ? assignedBuildings[0].id : '');
  const [unitId, setUnitId] = useState('');
  const [vacantUnits, setVacantUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState('');
  const [phone, setPhone] = useState('');
  const [link, setLink] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | generating | generated
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedBuilding = assignedBuildings.find((b) => b.id === buildingId);
  const selectedUnit = vacantUnits.find((u) => u.id === unitId);

  useEffect(() => {
    let cancelled = false;
    setUnitId('');

    if (!buildingId) {
      setVacantUnits([]);
      setUnitsError('');
      return undefined;
    }

    const loadVacantUnits = async () => {
      setUnitsLoading(true);
      setUnitsError('');
      try {
        const { units } = await getUnits(buildingId, { page: 1, limit: 100 });
        if (!cancelled) {
          setVacantUnits(Array.isArray(units) ? units.filter((u) => u.status === 'vacant') : []);
        }
      } catch (err) {
        if (!cancelled) setUnitsError(err.message || "We couldn't load vacant units for this building.");
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    };

    loadVacantUnits();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const handleGenerate = async () => {
    if (!buildingId) {
      setError('Select a building first.');
      return;
    }
    if (!unitId) {
      setError('Select a unit first — invite links are generated for one specific vacant unit.');
      return;
    }
    setError('');
    setStatus('generating');
    try {
      const { link: newLink } = await createTenantInvite(unitId);
      setLink(newLink);
      setStatus('generated');
    } catch (err) {
      setError(err.message || "We couldn't generate the invite link. Try again.");
      setStatus('idle');
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the link — copy it manually instead.');
    }
  };

  const handleSendWhatsApp = () => {
    if (!link || !selectedBuilding) return;
    const unitLine = selectedUnit ? ` for unit ${selectedUnit.unitNumber}` : '';
    const message =
      `Hi! You've been invited to join ${selectedBuilding.name}${unitLine} as a tenant.\n\n` +
      `Complete your registration here: ${link}`;
    const cleanedPhone = sanitizePhone(phone).replace(/^\+/, '');
    const base = cleanedPhone ? `https://wa.me/${cleanedPhone}` : 'https://wa.me/';
    const url = `${base}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    setLink(null);
    setStatus('idle');
    setCopied(false);
    setUnitId('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-tenant-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-50 text-brand-700 shrink-0">
              <LuMessageCircle aria-hidden="true" />
            </div>
            <div>
              <h3 id="invite-tenant-title" className="text-sm font-semibold text-slate-900">
                Invite Tenant via WhatsApp
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate a unit-specific link and send it straight to a prospective tenant.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
          >
            <LuX size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="invite-building">
                Building
              </label>
              <select
                id="invite-building"
                value={buildingId}
                onChange={(e) => {
                  setBuildingId(e.target.value);
                  setError('');
                }}
                disabled={status === 'generated'}
                className={inputClasses}
              >
                <option value="" disabled>
                  Select a building
                </option>
                {assignedBuildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="invite-unit">
                Unit
              </label>
              {unitsLoading ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-400">
                  <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                  Loading vacant units…
                </div>
              ) : (
                <select
                  id="invite-unit"
                  value={unitId}
                  onChange={(e) => {
                    setUnitId(e.target.value);
                    setError('');
                  }}
                  disabled={status === 'generated' || !buildingId || vacantUnits.length === 0}
                  className={inputClasses}
                >
                  <option value="">
                    {!buildingId
                      ? 'Select a building first'
                      : vacantUnits.length === 0
                        ? 'No vacant units'
                        : 'Select a vacant unit'}
                  </option>
                  {vacantUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber}
                    </option>
                  ))}
                </select>
              )}
              {unitsError && <p className="text-xs font-medium text-rose-600">{unitsError}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="invite-phone">
              Tenant's WhatsApp Number <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="invite-phone"
              type="tel"
              placeholder="+254 7XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClasses}
            />
            <p className="text-xs text-slate-400">
              Leave blank to pick the contact yourself inside WhatsApp when it opens.
            </p>
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          {status === 'generated' && link && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClasses}>Invite Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-canvas text-slate-600 text-xs truncate">
                  <LuLink className="shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="truncate">{link}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy invite link"
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <LuCheck className="text-emerald-600" aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Scoped to {selectedBuilding?.name}
                {selectedUnit ? `, unit ${selectedUnit.unitNumber}` : ''} — whoever opens it is onboarded directly into
                this unit.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
          {status === 'generated' ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors cursor-pointer"
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <LuMessageCircle aria-hidden="true" />
                Send via WhatsApp
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:border-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={status === 'generating' || !buildingId || !unitId}
                className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {status === 'generating' ? 'Generating…' : 'Generate Invite Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteTenantModal;