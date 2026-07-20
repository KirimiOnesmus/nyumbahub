import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LuActivity,
  LuServer,
  LuDatabase,
  LuMessageSquare,
  LuTimerReset,
  LuCircleCheck,
  LuTriangleAlert,
  LuCircleX,
  LuRefreshCw,
  LuKeyRound,
  LuSmartphone,
  LuSettings,
  LuLogIn,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { getSystemHealth, getActivityLog } from '../../../services/admin.service.js';

// How often the feed silently re-polls in the background. There's no
// websocket/streaming transport anywhere else in this app, so a bounded
// poll is the "real-time" mechanism consistent with the existing
// architecture rather than a new dependency.
const POLL_INTERVAL_MS = 15000;

const SERVICE_ICONS = {
  api: LuServer,
  database: LuDatabase,
  sms: LuMessageSquare,
  jobs: LuTimerReset,
};

const STATUS_STYLES = {
  operational: { icon: LuCircleCheck, tone: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Operational' },
  degraded: { icon: LuTriangleAlert, tone: 'text-amber-600', bg: 'bg-amber-50', label: 'Degraded' },
  down: { icon: LuCircleX, tone: 'text-red-600', bg: 'bg-red-50', label: 'Down' },
};

const ACTION_ICONS = {
  password_reset: LuKeyRound,
  phone_change: LuSmartphone,
  config_update: LuSettings,
  login: LuLogIn,
};

const formatTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ServiceHealthCard = ({ service }) => {
  const ServiceIcon = SERVICE_ICONS[service.name] || LuServer;
  const status = STATUS_STYLES[service.status] || STATUS_STYLES.operational;
  const StatusIcon = status.icon;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
          <ServiceIcon className="text-lg text-brand-700" aria-hidden="true" />
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.tone}`}>
          <StatusIcon aria-hidden="true" />
          {status.label}
        </span>
      </div>
      <p className="text-sm text-slate-500 capitalize">{service.label || service.name}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">
        {typeof service.latencyMs === 'number' ? `${service.latencyMs}ms` : '—'}
      </p>
      <p className="text-xs text-slate-400 mt-1">Checked {formatTime(service.lastCheckedAt)}</p>
    </Card>
  );
};

const ActivityRow = ({ entry }) => {
  const Icon = ACTION_ICONS[entry.action] || LuActivity;
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <div className="w-9 h-9 rounded-xl bg-canvas text-slate-500 flex items-center justify-center shrink-0">
        <Icon aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{entry.actor || 'System'}</span>{' '}
          {entry.description || entry.action}
          {entry.target && <span className="font-semibold text-slate-900"> {entry.target}</span>}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{formatTime(entry.createdAt)}</p>
      </div>
    </div>
  );
};

const SystemActivity = () => {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const [entries, setEntries] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [lastPolledAt, setLastPolledAt] = useState(null);

  const pollTimerRef = useRef(null);

  const loadHealth = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setHealthLoading(true);
    try {
      const res = await getSystemHealth();
      setHealth(res);
      setHealthError(null);
    } catch (err) {
      if (!silent) setHealthError(err.message || "We couldn't load system health. Try again.");
    } finally {
      if (!silent) setHealthLoading(false);
    }
  }, []);

  const loadFeed = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setFeedLoading(true);
    try {
      const res = await getActivityLog({ page: 1, limit: 30 });
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
      setFeedError(null);
      setLastPolledAt(new Date());
    } catch (err) {
      if (!silent) setFeedError(err.message || "We couldn't load the activity feed. Try again.");
    } finally {
      if (!silent) setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadAll = async ({ silent = false } = {}) => {
      await Promise.all([loadHealth({ silent }), loadFeed({ silent })]);
    };

    loadAll();

    pollTimerRef.current = setInterval(() => loadAll({ silent: true }), POLL_INTERVAL_MS);

    return () => clearInterval(pollTimerRef.current);
  }, [loadHealth, loadFeed]);

  const handleRefresh = () => {
    loadHealth();
    loadFeed();
  };

  const services = Array.isArray(health?.services) ? health.services : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Activity</h2>
          <p className="text-sm text-slate-500 mt-1">Live service health and a real-time feed of platform events.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200
                     text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer"
        >
          <LuRefreshCw aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">System Health</h3>
        {healthLoading && <Loader label="Checking system health…" />}
        {!healthLoading && healthError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            {healthError} This will populate once the backend endpoint is live.
          </div>
        )}
        {!healthLoading && !healthError && services.length === 0 && (
          <Card className="p-0">
            <EmptyState
              icon={LuServer}
              title="No health data yet"
              description="Service status will appear here once monitoring is connected."
            />
          </Card>
        )}
        {!healthLoading && !healthError && services.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((service) => (
              <ServiceHealthCard key={service.name} service={service} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Real-Time Activity Feed</h3>
          {lastPolledAt && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Live — updated {formatTime(lastPolledAt)}
            </span>
          )}
        </div>

        {feedLoading && <Loader label="Loading activity…" />}

        {!feedLoading && feedError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            {feedError} This will populate once the backend endpoint is live.
          </div>
        )}

        {!feedLoading && !feedError && entries.length === 0 && (
          <Card className="p-0">
            <EmptyState
              icon={LuActivity}
              title="No activity yet"
              description="Logins, password resets, and config changes across the platform will show up here as they happen."
            />
          </Card>
        )}

        {!feedLoading && !feedError && entries.length > 0 && (
          <Card className="p-0 divide-y divide-slate-100">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

export default SystemActivity;
