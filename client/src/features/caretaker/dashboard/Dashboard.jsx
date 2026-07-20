import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuDoorOpen,
  LuUserRound,
  LuReceipt,
  LuWallet,
  LuUserPlus,
  LuFilePlus2,
  LuCirclePlus,
  LuMegaphone,
  LuTriangleAlert,
  LuArrowRight,
  LuBuilding2,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx'; 
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { listBuildings } from '../../../services/building.service.js';
import { getBuildingReport, getOverdueTenants } from '../../../services/report.service.js';

import { getBuildingPayments } from '../../../services/payment.service.js';

const formatCurrency = (value) => `KES ${Number(value ?? 0).toLocaleString('en-KE')}`;
const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};


const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const daysOverdue = (dueDate) => {
  if (!dueDate) return 0;
  const diffMs = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
};

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer';

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

const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-700 hover:bg-brand-50 transition-colors cursor-pointer text-left"
  >
    <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
      <Icon aria-hidden="true" />
    </div>
    <span className="text-sm font-semibold text-slate-800">{label}</span>
  </button>
);

const SectionHeader = ({ title, actionLabel, onAction }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    {onAction && (
      <button
        type="button"
        onClick={onAction}
        className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer"
      >
        {actionLabel}
        <LuArrowRight aria-hidden="true" />
      </button>
    )}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(null);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingsError, setBuildingsError] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [overdueTenants, setOverdueTenants] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);


  useEffect(() => {
    let cancelled = false;

    const loadBuildings = async () => {
      setBuildingsLoading(true);
      setBuildingsError(null);
      try {
        const res = await listBuildings({ page: 1, limit: 100 });
        if (cancelled) return;
        setBuildings(res.buildings);
        setBuildingId((current) => current ?? res.buildings[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setBuildingsError(err.message || "We couldn't load your buildings. Try again.");
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };

    loadBuildings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!buildingId) return undefined;
    let cancelled = false;

    const load = async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        const [report, overdue, payments] = await Promise.all([
          getBuildingReport(buildingId, currentPeriod()),
          getOverdueTenants(buildingId),
          getBuildingPayments(buildingId, 5),
        ]);
        if (cancelled) return;
        setStats(report);
        setOverdueTenants(overdue.overdueTenants);
        setRecentPayments(payments.payments);
      } catch (err) {
        if (!cancelled) setDataError(err.message || "We couldn't load your dashboard. Try again.");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const buildingName = useMemo(
    () => buildings.find((b) => b.id === buildingId)?.name ?? '',
    [buildings, buildingId]
  );

  const paymentColumns = useMemo(
    () => [
      { key: 'tenant', label: 'Tenant', render: (r) => r.tenantName ?? '—' },
      { key: 'unit', label: 'Unit', render: (r) => r.unitNumber ?? '—' },
      { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
      { key: 'method', label: 'Method' },
      { key: 'paidOn', label: 'Paid On', render: (r) => formatDate(r.paidOn) },
    ],
    []
  );

  const overdueColumns = useMemo(
    () => [
      { key: 'tenant', label: 'Tenant', render: (r) => r.tenantName ?? '—' },
      { key: 'unit', label: 'Unit', render: (r) => r.unitNumber ?? '—' },
      { key: 'amountDue', label: 'Amount Due', render: (r) => formatCurrency(r.totalOverdue) },
      {
        key: 'daysOverdue',
        label: 'Overdue',
        render: (r) => <Badge tone="danger">{daysOverdue(r.oldestDueDate)} days</Badge>,
      },
    ],
    []
  );

  const loading = buildingsLoading || (Boolean(buildingId) && dataLoading && !stats);
  const error = buildingsError || dataError;
  const hasData = !loading && !buildingsError && Boolean(stats);
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {buildingName ? `Here's what's happening at ${buildingName}.` : "Here's what's happening today."}
          </p>
        </div>

        {buildings.length > 1 && (
          <select
            value={buildingId ?? ''}
            onChange={(e) => setBuildingId(e.target.value)}
            aria-label="Select building"
            className={selectClasses}
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <Loader label="Loading your dashboard…" />}

      {!buildingsLoading && !buildingsError && buildings.length === 0 && (
        <Card className="p-0">
          <EmptyState
            icon={LuBuilding2}
            title="No buildings assigned yet"
            description="Once you're assigned to a building, its overview will show up here."
          />
        </Card>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasData && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={LuDoorOpen}
              label="Units"
              value={`${stats.occupiedUnits}/${stats.totalUnits} Occupied`}
              tone="bg-sky-50 text-sky-600"
            />
            <StatCard
              icon={LuUserRound}
              label="Active Tenants"
              value={stats.activeTenants}
              tone="bg-violet-50 text-violet-600"
            />
            <StatCard
              icon={LuReceipt}
              label="Unpaid Bills"
              value={stats.unpaidBills}
              tone="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={LuWallet}
              label="Collected This Month"
              value={formatCurrency(stats.totalCollected)}
              tone="bg-green-50 text-green-600"
            />
          </div>

          <div>
            <SectionHeader title="Quick Actions" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickAction
                icon={LuUserPlus}
                label="Add Tenant"
                onClick={() => navigate('/caretaker/tenants/add')}
              />
              <QuickAction
                icon={LuCirclePlus}
                label="Record Payment"
                onClick={() => navigate('/caretaker/payments/add')}
              />
              <QuickAction
                icon={LuFilePlus2}
                label="Post Bill"
                onClick={() => navigate('/caretaker/bills/add')}
              />
              <QuickAction
                icon={LuMegaphone}
                label="Send Announcement"
                onClick={() => navigate('/caretaker/announcements/add')}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div>
              <SectionHeader
                title="Recent Payments"
                actionLabel="View all"
                onAction={() => navigate('/caretaker/payments')}
              />
              {recentPayments.length === 0 ? (
                <Card className="p-0">
                  <EmptyState icon={LuWallet} title="No payments yet" description="Recent payments will show up here." />
                </Card>
              ) : (
                <Card className="p-0">
                  <Table columns={paymentColumns} data={recentPayments} keyField="id" />
                </Card>
              )}
            </div>

            <div>
              <SectionHeader
                title="Overdue Tenants"
                actionLabel="View all"
                onAction={() => navigate('/caretaker/tenants')}
              />
              {overdueTenants.length === 0 ? (
                <Card className="p-0">
                  <EmptyState
                    icon={LuTriangleAlert}
                    title="Nothing overdue"
                    description="All tenants in this building are up to date."
                  />
                </Card> 
              ) : (
                <Card className="p-0">
                  <Table columns={overdueColumns} data={overdueTenants} keyField="tenantId" />
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
