import { useEffect, useMemo, useState } from 'react';
import {
  LuWallet,
  LuBuilding2,
  LuTriangleAlert,
  LuReceipt,
  LuCircleAlert,
  LuDownload,
  LuPrinter,
  LuHandCoins,
  LuTrendingUp,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { getPortfolioReport, getOverdueTenants } from '../../../services/report.service.js';

import { listBuildings } from '../../../services/building.service.js';
import { buildCsv, downloadCsv } from '../../../utils/exportCsv.js';

const formatCurrency = (value) => `KES ${Number(value ?? 0).toLocaleString('en-KE')}`;
const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer';

const secondaryButtonClasses =
  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 ' +
  'text-slate-700 hover:bg-canvas text-sm font-semibold transition-colors cursor-pointer';


const thisMonthValue = new Date().toISOString().slice(0, 7);

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
  { key: 'totalExpenses', label: 'Expenses', align: 'right', render: (r) => formatCurrency(r.totalExpenses) },
  {
    key: 'netIncome',
    label: 'Net Income',
    align: 'right',
    render: (r) => (
      <span className={r.netIncome < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
        {formatCurrency(r.netIncome)}
      </span>
    ),
  },
  { key: 'outstandingBalance', label: 'Outstanding', align: 'right', render: (r) => formatCurrency(r.outstandingBalance) },
  {
    key: 'occupancyRate',
    label: 'Occupancy',
    align: 'right',
    render: (r) => `${Math.round(r.occupancyRate)}% (${r.occupiedUnits}/${r.totalUnits})`,
  },
  {
    key: 'overdueCount',
    label: 'Overdue',
    align: 'right',
    render: (r) => (r.overdueCount > 0 ? <Badge tone="danger">{r.overdueCount}</Badge> : '—'),
  },
];

const EXPENSE_CATEGORY_LABELS = {
  maintenance: 'Maintenance',
  utilities: 'Utilities',
  salaries: 'Salaries',
  other: 'Other',
};

const expenseCategoryColumns = [
  { key: 'label', label: 'Category' },
  { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
];

const overdueColumns = [
  { key: 'tenantName', label: 'Tenant', render: (r) => r.tenantName ?? '—' },
  { key: 'unitNumber', label: 'Unit', render: (r) => r.unitNumber ?? '—' },
  { key: 'totalOverdue', label: 'Overdue Amount', align: 'right', render: (r) => formatCurrency(r.totalOverdue) },
  { key: 'billCount', label: 'Bills', align: 'right' },
  { key: 'oldestDueDate', label: 'Oldest Due', align: 'right', render: (r) => formatDate(r.oldestDueDate) },
];

const Reports = () => {
  const [period, setPeriod] = useState('all_time'); // 'all_time' | 'YYYY-MM'
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [buildings, setBuildings] = useState([]);
  const [report, setReport] = useState(null);
  const [overdueTenants, setOverdueTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const periodParam = period === 'all_time' ? undefined : period;
        const [portfolioReport, buildingsRes] = await Promise.all([
          getPortfolioReport(periodParam),
          listBuildings({ page: 1, limit: 100 }),
        ]);
        if (cancelled) return;
        setBuildings(buildingsRes.buildings);
        setReport(portfolioReport);

        const overdueResults = await Promise.all(
          buildingsRes.buildings.map((b) =>
            getOverdueTenants(b.id).catch(() => ({ overdueTenants: [] }))
          )
        );
        if (!cancelled) {
          setOverdueTenants(
            overdueResults.flatMap((res, i) =>
              res.overdueTenants.map((t) => ({ ...t, buildingId: buildingsRes.buildings[i].id }))
            )
          );
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load your reports. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const buildingRows = useMemo(() => {
    if (!report) return [];
    return buildingFilter === 'all'
      ? report.buildings
      : report.buildings.filter((b) => b.buildingId === buildingFilter);
  }, [report, buildingFilter]);

  const overdueRows = useMemo(
    () => (buildingFilter === 'all' ? overdueTenants : overdueTenants.filter((t) => t.buildingId === buildingFilter)),
    [overdueTenants, buildingFilter]
  );


  const selectedBuilding = useMemo(
    () => (buildingFilter === 'all' ? null : report?.buildings.find((b) => b.buildingId === buildingFilter) ?? null),
    [report, buildingFilter]
  );

  const displayTotals = selectedBuilding
    ? {
        totalBilled: selectedBuilding.totalBilled,
        totalCollected: selectedBuilding.totalCollected,
        totalExpenses: selectedBuilding.totalExpenses,
        netIncome: selectedBuilding.netIncome,
        outstandingBalance: selectedBuilding.outstandingBalance,
        occupancyRate: selectedBuilding.occupancyRate,
      }
    : report?.totals;

  const expenseCategoryRows = useMemo(() => {
    const source = selectedBuilding ? selectedBuilding.expensesByCategory : report?.expensesByCategory;
    if (!source) return [];
    return Object.entries(source)
      .map(([category, amount]) => ({
        category,
        label: EXPENSE_CATEGORY_LABELS[category] ?? category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [report, selectedBuilding]);

  const buildingLabel =
    buildingFilter === 'all' ? 'All Buildings' : buildings.find((b) => b.id === buildingFilter)?.name ?? 'All Buildings';
  const periodLabel = period === 'all_time' ? 'All Time' : period;
  const generatedAt = new Date().toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleDownloadCsv = () => {
    const totals = displayTotals;
    const csv = buildCsv([
      {
        title: `Property Portfolio Report — ${buildingLabel} — ${periodLabel}`,
        headers: ['Metric', 'Value'],
        rows: [
          ['Generated', generatedAt],
          ['Total Billed', totals?.totalBilled ?? 0],
          ['Total Collected', totals?.totalCollected ?? 0],
          ['Total Expenses', totals?.totalExpenses ?? 0],
          ['Net Income', totals?.netIncome ?? 0],
          ['Outstanding', totals?.outstandingBalance ?? 0],
          ['Occupancy Rate', `${Math.round(totals?.occupancyRate ?? 0)}%`],
        ],
      },
      {
        title: 'Building Performance',
        headers: [
          'Building',
          'Billed',
          'Collected',
          'Expenses',
          'Net Income',
          'Outstanding',
          'Occupancy Rate',
          'Occupied Units',
          'Total Units',
          'Overdue Bills',
        ],
        rows: buildingRows.map((r) => [
          r.buildingName,
          r.totalBilled,
          r.totalCollected,
          r.totalExpenses,
          r.netIncome,
          r.outstandingBalance,
          `${Math.round(r.occupancyRate)}%`,
          r.occupiedUnits,
          r.totalUnits,
          r.overdueCount,
        ]),
      },
      {
        title: selectedBuilding ? `Expenses by Category — ${buildingLabel}` : 'Expenses by Category (portfolio-wide)',
        headers: ['Category', 'Amount'],
        rows: expenseCategoryRows.map((r) => [r.label, r.amount]),
      },
      {
        title: 'Overdue Tenants',
        headers: ['Tenant', 'Unit', 'Overdue Amount', 'Bills', 'Oldest Due Date'],
        rows: overdueRows.map((r) => [r.tenantName ?? '—', r.unitNumber ?? '—', r.totalOverdue, r.billCount, formatDate(r.oldestDueDate)]),
      },
    ]);
    downloadCsv(`revenue-report-${period === 'all_time' ? 'all-time' : period}`, csv);
  };

  const handlePrint = () => window.print();

  if (loading) return <Loader label="Loading your reports…" />;

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
     
      <div className="hidden print:block mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Property Portfolio Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          {buildingLabel} · {periodLabel} · Generated {generatedAt}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Portfolio performance across your buildings.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} className={selectClasses}>
            <option value="all">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectClasses}>
            <option value="all_time">All Time</option>
            <option value={thisMonthValue}>This Month</option>
          </select>
          <button type="button" onClick={handleDownloadCsv} className={secondaryButtonClasses}>
            <LuDownload aria-hidden="true" />
            Download CSV
          </button>
          <button type="button" onClick={handlePrint} className={secondaryButtonClasses}>
            <LuPrinter aria-hidden="true" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-amber-800 print:hidden">
        <LuCircleAlert className="shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Revenue trend charts and caretaker activity aren't shown here — there's no backend support for
          month-by-month history or per-caretaker stats yet. Everything below, including expenses, reflects
          real data.
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={LuWallet} iconBg="bg-brand-50" iconColor="text-brand-700" label="Billed" value={formatCurrency(displayTotals?.totalBilled)} />
        <StatCard icon={LuReceipt} iconBg="bg-green-50" iconColor="text-green-700" label="Collected" value={formatCurrency(displayTotals?.totalCollected)} />
        <StatCard icon={LuHandCoins} iconBg="bg-amber-50" iconColor="text-amber-600" label="Expenses" value={formatCurrency(displayTotals?.totalExpenses)} />
        <StatCard
          icon={LuTrendingUp}
          iconBg={displayTotals && displayTotals.netIncome < 0 ? 'bg-rose-50' : 'bg-emerald-50'}
          iconColor={displayTotals && displayTotals.netIncome < 0 ? 'text-rose-600' : 'text-emerald-700'}
          label="Net Income"
          value={formatCurrency(displayTotals?.netIncome)}
        />
        <StatCard icon={LuTriangleAlert} iconBg="bg-red-50" iconColor="text-red-600" label="Outstanding" value={formatCurrency(displayTotals?.outstandingBalance)} />
        <StatCard icon={LuBuilding2} iconBg="bg-brand-50" iconColor="text-brand-700" label="Occupancy" value={`${Math.round(displayTotals?.occupancyRate ?? 0)}%`} />
      </div>

      <Card className="p-6 print:break-inside-avoid">
        <h3 className="font-bold text-slate-900 mb-4">Building Performance</h3>
        {buildingRows.length === 0 ? (
          <EmptyState icon={LuBuilding2} title="No buildings" description="Add a building to see performance here." />
        ) : (
          <Table columns={buildingColumns} data={buildingRows} keyField="buildingId" />
        )}
      </Card>

      <Card className="p-6 print:break-inside-avoid">
        <h3 className="font-bold text-slate-900 mb-1">Expenses by Category</h3>
        <p className="text-xs text-slate-500 mb-4">
          {selectedBuilding ? buildingLabel : 'Portfolio-wide'} for{' '}
          {periodLabel === 'All Time' ? 'all time' : periodLabel} — logged by caretakers and owners
          {selectedBuilding ? '.' : ' across all your buildings.'}
        </p>
        {expenseCategoryRows.every((r) => r.amount === 0) ? (
          <EmptyState icon={LuHandCoins} title="No expenses logged" description="Expenses your caretakers log will show up here." />
        ) : (
          <Table columns={expenseCategoryColumns} data={expenseCategoryRows} keyField="category" />
        )}
      </Card>

      <Card className="p-6 print:break-inside-avoid">
        <h3 className="font-bold text-slate-900 mb-4">Overdue Tenants</h3>
        {overdueRows.length === 0 ? (
          <EmptyState icon={LuTriangleAlert} title="Nothing overdue" description="All tenants are up to date." />
        ) : (
          <Table columns={overdueColumns} data={overdueRows} keyField="tenantId" />
        )}
      </Card>
    </div>
  );
};

export default Reports;