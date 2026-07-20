import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuBuilding2, LuGlobe, LuSendHorizontal, LuMessageCircle, LuCircleCheck } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import { listBuildings } from '../../../services/building.service.js';
import { createAnnouncement } from '../../../services/announcement.service.js';

const MESSAGE_MAX_LENGTH = 1000; // matches ANNOUNCEMENT_MESSAGE_MAX_LENGTH on the backend

const AUDIENCE_OPTIONS = [
  { id: 'portfolio', label: 'Entire Portfolio', description: 'Every active tenant across all your buildings', icon: LuGlobe },
  { id: 'building', label: 'A Building', description: 'Every active tenant in one building', icon: LuBuilding2 },
];

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all';

const AddNotification = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [audience, setAudience] = useState('portfolio');
  const [buildingId, setBuildingId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { recipientCount, successCount, failureCount }
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setBuildingsLoading(true);
      try {
        const { buildings: list } = await listBuildings({ page: 1, limit: 100 });
        if (!cancelled) {
          setBuildings(list);
          if (list.length > 0) setBuildingId(list[0].id);
        }
      } catch {
        if (!cancelled) setError("We couldn't load your buildings. Try again.");
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const recipientSummary = useMemo(() => {
    if (audience === 'portfolio') {
      return buildings.length > 0
        ? `Every active tenant across all ${buildings.length} building${buildings.length === 1 ? '' : 's'} in your portfolio`
        : 'No buildings in your portfolio yet';
    }
    const building = buildings.find((b) => b.id === buildingId);
    return building ? `Every active tenant in ${building.name}` : 'Select a building';
  }, [audience, buildingId, buildings]);

  const canSubmit =
    message.trim().length > 0 &&
    message.trim().length <= MESSAGE_MAX_LENGTH &&
    (audience !== 'building' || Boolean(buildingId)) &&
    buildings.length > 0 &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const targetBuildingIds = audience === 'portfolio' ? buildings.map((b) => b.id) : [buildingId];

      // No portfolio-wide send endpoint exists — a "portfolio" announcement is a
      // real broadcast to every building, one request each, aggregated below.
      const results = await Promise.all(
        targetBuildingIds.map((id) => createAnnouncement(id, message.trim()))
      );

      const totals = results.reduce(
        (acc, r) => ({
          recipientCount: acc.recipientCount + r.announcement.recipientCount,
          successCount: acc.successCount + r.announcement.successCount,
          failureCount: acc.failureCount + r.announcement.failureCount,
        }),
        { recipientCount: 0, successCount: 0, failureCount: 0 }
      );

      setResult(totals);
      setTimeout(() => navigate('/owner/notifications'), 1800);
    } catch (err) {
      setError(err.message || "We couldn't send this announcement. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-full">
      <button
        type="button"
        onClick={() => navigate('/owner/notifications')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer w-fit"
      >
        <LuArrowLeft aria-hidden="true" />
        Back to Notifications
      </button>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">New Announcement</h2>
        <p className="text-sm text-slate-500 mt-1">Send a WhatsApp message to your tenants.</p>
      </div>

      {result ? (
        <Card className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <LuCircleCheck aria-hidden="true" />
          </div>
          <h3 className="font-bold text-slate-900">Announcement sent</h3>
          <p className="text-sm text-slate-500">
            Reached {result.successCount} of {result.recipientCount} tenants
            {result.failureCount > 0 ? ` · ${result.failureCount} failed` : ''}.
          </p>
          <p className="text-xs text-slate-400">Redirecting you back to Notifications…</p>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900">Who should receive this?</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {AUDIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = audience === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAudience(opt.id)}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      active ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={active ? 'text-brand-700' : 'text-slate-400'} aria-hidden="true" />
                    <p className={`text-sm font-semibold mt-2 ${active ? 'text-brand-700' : 'text-slate-800'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </button>
                );
              })}
            </div>

            {audience === 'building' && (
              <div>
                <label htmlFor="building" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Building
                </label>
                <select
                  id="building"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  disabled={buildingsLoading}
                  className={`${inputClasses} mt-1.5 cursor-pointer`}
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-canvas rounded-lg px-3.5 py-2.5">
              <LuGlobe className="shrink-0" aria-hidden="true" />
              {recipientSummary}. Exact recipient count is confirmed once it's sent.
            </div>
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="message" className="text-sm font-bold text-slate-900">
                Message
              </label>
              <span className={`text-xs ${message.length > MESSAGE_MAX_LENGTH ? 'text-red-600' : 'text-slate-400'}`}>
                {message.length}/{MESSAGE_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="e.g. Water supply will be interrupted this Friday from 9am–2pm for maintenance."
              className={`${inputClasses} resize-none`}
            />
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <LuMessageCircle className="shrink-0" aria-hidden="true" />
              Sent via WhatsApp using an approved message template.
            </p>
          </Card>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
               hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <LuSendHorizontal aria-hidden="true" />
              {submitting ? 'Sending…' : 'Send Announcement'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/owner/notifications')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddNotification;