import { useEffect, useMemo, useState } from 'react';
import { LuWallet, LuReceipt, LuTriangleAlert, LuPercent, LuBuilding2 } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import RevenueTrendChart from '../../../components/charts/RevenueChart.jsx';
import { getPortfolioReport, getRevenueTrend } from '../../../services/report.service.js';
import { listBuildings } from '../../../services/building.service.js';

const formatCurrency = (value) => `KES ${Number(value ?? 0).toLocaleString('en-KE')}`;

const collectionRate = (billed, collected) => (billed > 0 ? (collected / billed) * 100 : 0);

const collectionTone = (rate) => {
  if (rate >= 90) return 'success';
  if (rate >= 70) return 'warning';
  return 'danger';
};

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-KE', { month: 'short', year: 'numeric' });

// "2026-07" -> "Jul 2026". Parsed as UTC to avoid local-timezone month drift.
const formatPeriodLabel = (period) => {
  const [year, month] = period.split('-').map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
};

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer';

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value }) => (
  <Card className="p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
      <Icon aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
    </div>
  </Card>
);

const buildingColumns = [
  { key: 'buildingName', label: 'Building' },
  { key: 'totalBilled', label: 'Billed', align: 'right', render: (r) => formatCurrency(r.totalBilled) },
  { key: 'totalCollected', label: 'Collected', align: 'right', render: (r) => formatCurrency(r.totalCollected) },
  {
    key: 'collectionRate',
    label: 'Collection Rate',
    align: 'right',
    render: (r) => {
      const rate = collectionRate(r.totalBilled, r.totalCollected);
      return <Badge tone={collectionTone(rate)}>{Math.round(rate)}%</Badge>;
    },
  },
  { key: 'outstandingBalance', label: 'Outstanding', align: 'right', render: (r) => formatCurrency(r.outstandingBalance) },
];

const Revenue = () => {
  const [buildings, setBuildings] = useState([]);
  const [report, setReport] = useState(null);
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [trendMonths, setTrendMonths] = useState(6);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [portfolioReport, buildingsRes] = await Promise.all([
          getPortfolioReport(),
          listBuildings({ page: 1, limit: 100 }),
        ]);
        if (!cancelled) {
          setReport(portfolioReport);
          setBuildings(buildingsRes.buildings);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load your revenue data. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTrend = async () => {
      setTrendLoading(true);
      try {
        const { months } = await getRevenueTrend(trendMonths);
        if (!cancelled) {
          setTrend(
            months.map((m) => ({
              month: formatPeriodLabel(m.period),
              billed: m.totalBilled,
              collected: m.totalCollected,
            }))
          );
        }
      } catch {
        if (!cancelled) setTrend([]);
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    };

    loadTrend();
    return () => {
      cancelled = true;
    };
  }, [trendMonths]);

  const buildingRows = useMemo(() => {
    if (!report) return [];
    const rows =
      buildingFilter === 'all'
        ? report.buildings
        : report.buildings.filter((b) => b.buildingId === buildingFilter);
    return [...rows].sort((a, b) => b.totalCollected - a.totalCollected);
  }, [report, buildingFilter]);

  const overallRate = report ? collectionRate(report.totals.totalBilled, report.totals.totalCollected) : 0;

  if (loading) return <Loader label="Loading your revenue…" />;

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Revenue</h2>
          <p className="text-sm text-slate-500 mt-1">
            How well your portfolio is collecting the rent it's owed.
          </p>
        </div>
        <select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} className={selectClasses}>
          <option value="all">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={LuWallet}
          iconBg="bg-brand-50"
          iconColor="text-brand-700"
          label="Total Billed"
          value={formatCurrency(report?.totals.totalBilled)}
        />
        <StatCard
          icon={LuReceipt}
          iconBg="bg-green-50"
          iconColor="text-green-700"
          label="Total Collected"
          value={formatCurrency(report?.totals.totalCollected)}
        />
        <StatCard
          icon={LuTriangleAlert}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          label="Outstanding"
          value={formatCurrency(report?.totals.outstandingBalance)}
        />
        <StatCard
          icon={LuPercent}
          iconBg="bg-brand-50"
          iconColor="text-brand-700"
          label="Collection Rate"
          value={`${Math.round(overallRate)}%`}
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-bold text-slate-900">Revenue Trend</h3>
            <p className="text-sm text-slate-500 mt-0.5">Billed vs. collected, by month.</p>
          </div>
          <select
            value={trendMonths}
            onChange={(e) => setTrendMonths(Number(e.target.value))}
            className={selectClasses}
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>
        {trendLoading ? (
          <Loader label="Loading trend…" />
        ) : trend.length === 0 ? (
          <EmptyState icon={LuTriangleAlert} title="No billing history yet" description="Trend data will appear once bills have been generated." />
        ) : (
          <RevenueTrendChart data={trend} />
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-slate-900 mb-4">Revenue by Building</h3>
        {buildingRows.length === 0 ? (
          <EmptyState icon={LuBuilding2} title="No buildings" description="Add a building to see revenue here." />
        ) : (
          <Table columns={buildingColumns} data={buildingRows} keyField="buildingId" />
        )}
      </Card>
    </div>
  );
};

export default Revenue;