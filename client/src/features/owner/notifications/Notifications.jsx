import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuSearch,
  LuBell,
  LuSendHorizontal,
  LuUsers,
  LuTriangleAlert,
  LuRotateCcw,
  LuPlus,
  LuX,
  LuUserCog,
  LuClock,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { listAnnouncements, createAnnouncement } from '../../../services/announcement.service.js';
import { listBuildings } from '../../../services/building.service.js';

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const deliveryTone = (successCount, recipientCount) => {
  if (recipientCount === 0) return 'neutral';
  if (successCount === recipientCount) return 'success';
  if (successCount === 0) return 'danger';
  return 'warning';
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <Card className="p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
      <Icon aria-hidden="true" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  </Card>
);

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-canvas text-slate-400 flex items-center justify-center shrink-0">
      <Icon aria-hidden="true" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);


const AnnouncementModal = ({ announcement, onClose, onSendAgain, sendingAgain }) => {
  if (!announcement) return null;
  const hasFailures = announcement.failureCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Announcement</p>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{announcement.buildingName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <LuX aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Message</p>
            <p className="text-sm text-slate-800 leading-relaxed bg-canvas border border-slate-100 rounded-xl px-4 py-3.5 whitespace-pre-wrap">
              {announcement.message}
            </p>
          </div>

          <DetailRow icon={LuUserCog} label="Sent By" value={announcement.sentBy?.name ?? 'Unknown'} />
          <DetailRow icon={LuClock} label="Sent At" value={formatDate(announcement.createdAt)} />
          <DetailRow
            icon={LuUsers}
            label="Delivery"
            value={`${announcement.successCount} of ${announcement.recipientCount} delivered${
              hasFailures ? ` · ${announcement.failureCount} failed` : ''
            }`}
          />
        </div>

        {hasFailures && (
          <div className="p-6 pt-0">
            <button
              type="button"
              onClick={() => onSendAgain(announcement)}
              disabled={sendingAgain}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
               hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <LuRotateCcw className={sendingAgain ? 'animate-spin' : ''} aria-hidden="true" />
              {sendingAgain ? 'Sending…' : "Send Again to This Building's Active Tenants"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [sendingAgainId, setSendingAgainId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { buildings: buildingList } = await listBuildings({ page: 1, limit: 100 });
        if (!cancelled) setBuildings(buildingList);

        
      
        const perBuilding = await Promise.all(
          buildingList.map((b) =>
            listAnnouncements(b.id, { page: 1, limit: 100 }).catch(() => ({ announcements: [] }))
          )
        );
        if (!cancelled) {
          const flattened = perBuilding
            .flatMap((res, i) =>
              res.announcements.map((a) => ({ ...a, buildingName: buildingList[i].name }))
            )
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setAnnouncements(flattened);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load your notifications. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAnnouncements = useMemo(() => {
    if (!Array.isArray(announcements)) return [];
    const q = search.trim().toLowerCase();

    return announcements.filter((a) => {
      const matchesSearch =
        !q || a.message.toLowerCase().includes(q) || (a.sentBy?.name ?? '').toLowerCase().includes(q);
      const matchesBuilding = buildingFilter === 'all' || a.buildingId === buildingFilter;
      return matchesSearch && matchesBuilding;
    });
  }, [announcements, search, buildingFilter]);

  const hasActiveFilters = Boolean(search) || buildingFilter !== 'all';

  const stats = useMemo(
    () =>
      announcements.reduce(
        (acc, a) => ({
          sent: acc.sent + 1,
          recipients: acc.recipients + a.recipientCount,
          failed: acc.failed + a.failureCount,
        }),
        { sent: 0, recipients: 0, failed: 0 }
      ),
    [announcements]
  );

  const selectedAnnouncement = useMemo(
    () => announcements.find((a) => a.id === selectedId) ?? null,
    [announcements, selectedId]
  );

  const handleSendAgain = async (announcement) => {
    setSendingAgainId(announcement.id);
    try {
      const { announcement: resent } = await createAnnouncement(announcement.buildingId, announcement.message);
      setAnnouncements((prev) => [{ ...resent, buildingName: announcement.buildingName }, ...prev]);
      setSelectedId(resent.id);
    } catch {
      // Surfaced implicitly: the modal stays open on the original announcement and the button re-enables, letting the owner retry.
   
    } finally {
      setSendingAgainId(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'buildingName', label: 'Building', render: (row) => row.buildingName },
      {
        key: 'message',
        label: 'Message',
        render: (row) => <span className="line-clamp-1 max-w-xs inline-block align-middle">{row.message}</span>,
      },
      { key: 'sentBy', label: 'Sent By', render: (row) => row.sentBy?.name ?? '—' },
      { key: 'createdAt', label: 'Sent At', render: (row) => formatDate(row.createdAt) },
      {
        key: 'delivery',
        label: 'Delivery',
        align: 'right',
        render: (row) => (
          <Badge tone={deliveryTone(row.successCount, row.recipientCount)}>
            {row.successCount}/{row.recipientCount}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? 'Loading your notifications…'
              : `${filteredAnnouncements.length} announcement${filteredAnnouncements.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner/notifications/add')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
           hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <LuPlus aria-hidden="true" />
          New Announcement
        </button>
      </div>

      {!loading && !error && (
        <div className="grid sm:grid-cols-3 gap-5">
          <StatCard icon={LuSendHorizontal} label="Announcements Sent" value={stats.sent} tone="bg-brand-50 text-brand-700" />
          <StatCard icon={LuUsers} label="Total Recipients Reached" value={stats.recipients} tone="bg-green-50 text-green-600" />
          <StatCard icon={LuTriangleAlert} label="Failed Deliveries" value={stats.failed} tone="bg-red-50 text-red-600" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <label className="relative w-full md:max-w-sm">
          <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by message or sender…"
            aria-label="Search notifications"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400"
          />
        </label>

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          aria-label="Filter by building"
          className={selectClasses}
        >
          <option value="all">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loader label="Loading your notifications…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && filteredAnnouncements.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuBell}
            title={hasActiveFilters ? 'No announcements match your filters' : 'No announcements yet'}
            description={
              hasActiveFilters
                ? 'Try a different search term or building.'
                : 'WhatsApp announcements you send to tenants will show up here.'
            }
            action={
              !hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => navigate('/owner/notifications/add')}
                  className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                   hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <LuPlus aria-hidden="true" />
                  New Announcement
                </button>
              )
            }
          />
        </Card>
      )}

      {!loading && !error && filteredAnnouncements.length > 0 && (
        <Card className="p-0">
          <Table columns={columns} data={filteredAnnouncements} keyField="id" onRowClick={(row) => setSelectedId(row.id)} />
        </Card>
      )}

      <AnnouncementModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedId(null)}
        onSendAgain={handleSendAgain}
        sendingAgain={sendingAgainId === selectedId}
      />
    </div>
  );
};

export default Notifications;