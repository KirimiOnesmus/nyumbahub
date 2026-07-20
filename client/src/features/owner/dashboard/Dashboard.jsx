import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuBuilding2, LuUserPlus, LuFileChartColumn, LuMegaphone, LuCircleAlert } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import DashboardCards from './DashboardCards.jsx';
import { getPortfolioReport } from '../../../services/report.service.js';
import { listCaretakers } from '../../../services/caretaker.service.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const currency = (value) => `KES ${value.toLocaleString('en-KE')}`;

const QUICK_ACTIONS = [
  { label: 'Add Building', icon: LuBuilding2, variant: 'secondary', to: '/owner/buildings' },
  { label: 'Add Caretaker', icon: LuUserPlus, variant: 'secondary', to: '/owner/caretakers' },
  { label: 'View Reports', icon: LuFileChartColumn, variant: 'secondary', to: '/owner/reports' },
  { label: 'Send Announcement', icon: LuMegaphone, variant: 'primary', to: '/owner/notifications/add' },
];

const BuildingPerformanceTable = ({ buildings }) => {
  if (!Array.isArray(buildings) || buildings.length === 0) {
    return <EmptyState icon={LuBuilding2} title="No buildings yet" description="Add a building to see performance here." />;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {buildings.map((b) => (
        <li key={b.id} className="py-4 flex items-center gap-4">
          <div className="min-w-[140px]">
            <p className="font-bold text-slate-900 text-sm">{b.name}</p>
            <p className="text-xs text-slate-500">{b.location}</p>
          </div>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full"
                style={{ width: `${b.occupancyPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700 w-10 text-right">
              {b.occupancyPct}%
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 w-28 text-right">{currency(b.revenue)}</p>
        </li>
      ))}
    </ul>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard = () => {
    const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
const firstName = user?.name?.split(' ')[0] ?? '';
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [report, caretakersRes] = await Promise.all([
          getPortfolioReport(),
          listCaretakers({ page: 1, limit: 1 }),
        ]);
        if (!cancelled) {
          setData({
            stats: {
              activeBuildings: report.buildings.length,
              occupiedUnits: report.totals.occupiedUnits,
              totalUnits: report.totals.totalUnits,
              monthlyRevenue: report.totals.totalCollected,
              
              revenueGrowthPct: null,
              outstandingRent: report.totals.outstandingBalance,
              totalCaretakers: caretakersRes.pagination.total,
            },
            overdueCount: report.totals.overdueCount,
            buildingPerformance: report.buildings.map((b) => ({
              id: b.buildingId,
              name: b.buildingName,
              occupancyPct: b.occupancyRate,
              revenue: b.totalCollected,
            })),
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'We couldn\u2019t load your portfolio data. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loader label="Loading your portfolio…" />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">    {getGreeting()}{firstName ? `, ${firstName}` : ''}</h2>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening across your portfolio today.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map(({ label, icon: Icon, variant, to }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(to)}
              className={
                variant === 'primary'
                  ? 'flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors'
                  : 'flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-sm font-semibold transition-colors'
              }
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
 
      <DashboardCards stats={data.stats} />

      {data.overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3 text-sm text-amber-800">
          <LuCircleAlert className="shrink-0" aria-hidden="true" />
          {data.overdueCount} bill{data.overdueCount === 1 ? ' is' : 's are'} currently overdue across your portfolio.
        </div>
      )}
 
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900">Building Performance</h3>
          <button
            type="button"
            onClick={() => navigate('/owner/buildings')}
            className="text-sm font-semibold text-brand-700 hover:underline transition-colors cursor-pointer"
          >
            View All
          </button>
        </div>
        <BuildingPerformanceTable buildings={data.buildingPerformance} />
      </Card>
    </div>
  );
};

export default Dashboard;
