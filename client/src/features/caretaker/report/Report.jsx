import { useEffect, useMemo, useState } from 'react';
import {
  LuWallet,
  LuDoorOpen,
  LuTriangleAlert,
  LuReceipt,
  LuDownload,
  LuPrinter,
  LuCircleAlert,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { getBuildings } from '../../../services/building.service.js';
import { getBuildingReport, getOverdueTenants } from '../../../services/report.service.js';
import { getBuildingPayments } from '../../../services/payment.service.js';
import { buildCsv, downloadCsv } from '../../../utils/exportCsv.js';

const formatCurrency = (value) => `KES ${Number(value ?? 0).toLocaleString('en-KE')}`;
const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};
const daysSince = (value) => (value ? Math.max(0, Math.floor((Date.now() - new Date(value)) / 86_400_000)) : null);

const RECENT_PAYMENTS_LIMIT = 20; 
const thisMonthValue = new Date().toISOString().slice(0, 7);

const selectClasses =
  'px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const secondaryButtonClasses =
  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 ' +
  'text-slate-700 hover:bg-canvas text-sm font-semibold transition-colors cursor-pointer';

const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenue', icon: LuWallet, supportsPeriod: true },
  { id: 'occupancy', label: 'Occupancy', icon: LuDoorOpen, supportsPeriod: false },
  { id: 'overdue', label: 'Overdue Tenants', icon: LuTriangleAlert, supportsPeriod: false },
  { id: 'payments', label: 'Payment History', icon: LuReceipt, supportsPeriod: false },
];

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

const Report = () => {
  const [reportId, setReportId] = useState('revenue');
  const [period, setPeriod] = useState('all_time'); 
  const [buildings, setBuildings] = useState([]);
  const [buildingFilter, setBuildingFilter] = useState('all');

  const [buildingReports, setBuildingReports] = useState([]); 
  const [overdueTenants, setOverdueTenants] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { buildings: list } = await getBuildings({ page: 1, limit: 100 });
        const safeBuildings = Array.isArray(list) ? list : [];
        if (cancelled) return;
        setBuildings(safeBuildings);

        const periodParam = period === 'all_time' ? undefined : period;

        const [reports, overdueResults, paymentResults] = await Promise.all([
          Promise.all(
            safeBuildings.map((b) =>
              getBuildingReport(b.id, periodParam).catch(() => null)
            )
          ),
          Promise.all(
            safeBuildings.map((b) => getOverdueTenants(b.id).catch(() => ({ overdueTenants: [] })))
          ),
          Promise.all(
            safeBuildings.map((b) =>
              getBuildingPayments(b.id, RECENT_PAYMENTS_LIMIT).catch(() => ({ payments: [] }))
            )
          ),
        ]);

        if (cancelled) return;

        setBuildingReports(reports.filter(Boolean));
        setOverdueTenants(
          overdueResults.flatMap((res, i) =>
            (res.overdueTenants ?? []).map((t) => ({ ...t, buildingId: safeBuildings[i].id, buildingName: safeBuildings[i].name }))
          )
        );
        setPayments(
          paymentResults.flatMap((res, i) =>
            (res.payments ?? []).map((p) => ({ ...p, buildingId: safeBuildings[i].id, buildingName: safeBuildings[i].name }))
          )
        );
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

  const activeReport = REPORT_TYPES.find((r) => r.id === reportId);

  const revenueRows = useMemo(
    () => (buildingFilter === 'all' ? buildingReports : buildingReports.filter((r) => r.buildingId === buildingFilter)),
    [buildingReports, buildingFilter]
  );
  const occupancyRows = revenueRows; 
  const overdueRows = useMemo(
    () => (buildingFilter === 'all' ? overdueTenants : overdueTenants.filter((t) => t.buildingId === buildingFilter)),
    [overdueTenants, buildingFilter]
  );
  const paymentRows = useMemo(
    () => (buildingFilter === 'all' ? payments : payments.filter((p) => p.buildingId === buildingFilter)),
    [payments, buildingFilter]
  );

  const revenueColumns = useMemo(
    () => [
      { key: 'buildingName', label: 'Building' },
      { key: 'totalBilled', label: 'Billed', align: 'right', render: (r) => formatCurrency(r.totalBilled) },
      { key: 'totalCollected', label: 'Collected', align: 'right', render: (r) => formatCurrency(r.totalCollected) },
      { key: 'outstandingBalance', label: 'Outstanding', align: 'right', render: (r) => formatCurrency(r.outstandingBalance) },
    ],
    []
  );

  const occupancyColumns = useMemo(
    () => [
      { key: 'buildingName', label: 'Building' },
      { key: 'totalUnits', label: 'Total Units', align: 'right' },
      { key: 'occupiedUnits', label: 'Occupied', align: 'right' },
      { key: 'vacantUnits', label: 'Vacant', align: 'right' },
      { key: 'occupancyRate', label: 'Occupancy Rate', align: 'right', render: (r) => `${Math.round(r.occupancyRate)}%` },
    ],
    []
  );

  const overdueColumns = useMemo(
    () => [
      { key: 'tenantName', label: 'Tenant', render: (r) => r.tenantName ?? '—' },
      { key: 'building', label: 'Building / Unit', render: (r) => `${r.buildingName} · Unit ${r.unitNumber ?? '—'}` },
      { key: 'totalOverdue', label: 'Overdue Amount', align: 'right', render: (r) => formatCurrency(r.totalOverdue) },
      { key: 'billCount', label: 'Bills', align: 'right' },
      {
        key: 'oldestDueDate',
        label: 'Overdue Since',
        align: 'right',
        render: (r) => (
          <span>
            {formatDate(r.oldestDueDate)}{' '}
            <Badge tone="danger">{daysSince(r.oldestDueDate)}d</Badge>
          </span>
        ),
      },
    ],
    []
  );

  const paymentColumns = useMemo(
    () => [
      { key: 'tenantName', label: 'Tenant', render: (r) => r.tenantName ?? '—' },
      { key: 'building', label: 'Building / Unit', render: (r) => `${r.buildingName} · Unit ${r.unitNumber ?? '—'}` },
      { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
      { key: 'paidOn', label: 'Paid On', render: (r) => formatDate(r.paidOn) },
      { key: 'method', label: 'Method', render: (r) => <Badge tone="success">{r.method}</Badge> },
    ],
    []
  );

  const reportConfig = useMemo(() => {
    switch (reportId) {
      case 'revenue':
        return { rows: revenueRows, columns: revenueColumns, keyField: 'buildingId', emptyTitle: 'No revenue data for this selection' };
      case 'occupancy':
        return { rows: occupancyRows, columns: occupancyColumns, keyField: 'buildingId', emptyTitle: 'No occupancy data for this selection' };
      case 'overdue':
        return { rows: overdueRows, columns: overdueColumns, keyField: 'tenantId', emptyTitle: 'No overdue tenants right now' };
      case 'payments':
        return { rows: paymentRows, columns: paymentColumns, keyField: 'id', emptyTitle: 'No payments to show' };
      default:
        return { rows: [], columns: [], keyField: 'id', emptyTitle: 'No data' };
    }
  }, [reportId, revenueRows, revenueColumns, occupancyRows, occupancyColumns, overdueRows, overdueColumns, paymentRows, paymentColumns]);

  const buildingLabel =
    buildingFilter === 'all' ? 'All My Buildings' : buildings.find((b) => b.id === buildingFilter)?.name ?? 'All My Buildings';
  const periodLabel = period === 'all_time' ? 'All Time' : 'This Month';
  const generatedAt = new Date().toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleExport = () => {
    const headers = reportConfig.columns.map((c) => c.label);
    const rowToCells = {
      revenue: (r) => [r.buildingName, r.totalBilled, r.totalCollected, r.outstandingBalance],
      occupancy: (r) => [r.buildingName, r.totalUnits, r.occupiedUnits, r.vacantUnits, `${Math.round(r.occupancyRate)}%`],
      overdue: (r) => [r.tenantName ?? '—', `${r.buildingName} · Unit ${r.unitNumber ?? '—'}`, r.totalOverdue, r.billCount, formatDate(r.oldestDueDate)],
      payments: (r) => [r.tenantName ?? '—', `${r.buildingName} · Unit ${r.unitNumber ?? '—'}`, r.amount, formatDate(r.paidOn), r.method],
    }[reportId];

    const csv = buildCsv([
      {
        title: `${activeReport.label} Report — ${buildingLabel} — ${activeReport.supportsPeriod ? periodLabel : 'Current'}`,
        headers: ['Generated', generatedAt],
        rows: [],
      },
      { headers, rows: reportConfig.rows.map(rowToCells) },
    ]);
    downloadCsv(`${reportId}-report-${buildingFilter === 'all' ? 'all-buildings' : buildingFilter}`, csv);
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden print:block mb-2">
        <h1 className="text-2xl font-bold text-slate-900">{activeReport.label} Report</h1>
        <p className="text-sm text-slate-500 mt-1">
          {buildingLabel} · {activeReport.supportsPeriod ? periodLabel : 'Current'} · Generated {generatedAt}
        </p>
      </div>

      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Reports for buildings assigned to you.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-amber-800 print:hidden">
        <LuCircleAlert className="shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Revenue only covers rent/bill collection, not expenses — that's owner-level financial data. There's no
          rolling multi-month trend either, just All Time or This Month. Payment History shows only your most
          recent {RECENT_PAYMENTS_LIMIT} completed M-Pesa payments per building — manual cash/bank settlements are
          reconciled on Bills directly and won't appear here.
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          const active = reportId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setReportId(r.id)}
              className={`flex flex-col items-start gap-2.5 p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                active ? 'border-brand-700 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-brand-100 text-brand-700' : 'bg-canvas text-slate-400'}`}>
                <Icon aria-hidden="true" />
              </div>
              <span className={`text-sm font-semibold ${active ? 'text-brand-700' : 'text-slate-700'}`}>{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-3">
          <select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} aria-label="Filter by building" className={selectClasses}>
            <option value="all">All My Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Filter by period"
            disabled={!activeReport.supportsPeriod}
            className={selectClasses}
          >
            <option value="all_time">All Time</option>
            <option value={thisMonthValue}>This Month</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleExport} disabled={reportConfig.rows.length === 0} className={`${secondaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <LuDownload aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" onClick={handlePrint} className={secondaryButtonClasses}>
            <LuPrinter aria-hidden="true" />
            Print
          </button>
        </div>
      </div>

      {loading && <Loader label="Loading your reports…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          {reportId === 'revenue' && (
            <div className="grid sm:grid-cols-3 gap-4 print:hidden">
              <StatCard icon={LuWallet} iconBg="bg-brand-50" iconColor="text-brand-700" label="Billed" value={formatCurrency(revenueRows.reduce((s, r) => s + r.totalBilled, 0))} />
              <StatCard icon={LuReceipt} iconBg="bg-green-50" iconColor="text-green-700" label="Collected" value={formatCurrency(revenueRows.reduce((s, r) => s + r.totalCollected, 0))} />
              <StatCard icon={LuTriangleAlert} iconBg="bg-red-50" iconColor="text-red-600" label="Outstanding" value={formatCurrency(revenueRows.reduce((s, r) => s + r.outstandingBalance, 0))} />
            </div>
          )}

          {reportId === 'occupancy' && (
            <div className="grid sm:grid-cols-3 gap-4 print:hidden">
              <StatCard icon={LuDoorOpen} iconBg="bg-brand-50" iconColor="text-brand-700" label="Total Units" value={occupancyRows.reduce((s, r) => s + r.totalUnits, 0)} />
              <StatCard icon={LuDoorOpen} iconBg="bg-green-50" iconColor="text-green-700" label="Occupied" value={occupancyRows.reduce((s, r) => s + r.occupiedUnits, 0)} />
              <StatCard icon={LuDoorOpen} iconBg="bg-red-50" iconColor="text-red-600" label="Vacant" value={occupancyRows.reduce((s, r) => s + r.vacantUnits, 0)} />
            </div>
          )}

          {reportId === 'overdue' && (
            <div className="grid sm:grid-cols-2 gap-4 print:hidden">
              <StatCard icon={LuTriangleAlert} iconBg="bg-red-50" iconColor="text-red-600" label="Total Overdue" value={formatCurrency(overdueRows.reduce((s, r) => s + r.totalOverdue, 0))} />
              <StatCard icon={LuTriangleAlert} iconBg="bg-brand-50" iconColor="text-brand-700" label="Tenants Overdue" value={overdueRows.length} />
            </div>
          )}

          {reportId === 'payments' && (
            <div className="grid sm:grid-cols-1 gap-4 print:hidden">
              <StatCard
                icon={LuReceipt}
                iconBg="bg-green-50"
                iconColor="text-green-700"
                label={`Collected (shown ${paymentRows.length} payment${paymentRows.length === 1 ? '' : 's'})`}
                value={formatCurrency(paymentRows.reduce((s, r) => s + r.amount, 0))}
              />
            </div>
          )}

          {reportConfig.rows.length === 0 ? (
            <Card className="p-0">
              <EmptyState icon={activeReport.icon} title={reportConfig.emptyTitle} description="Try a different building or period." />
            </Card>
          ) : (
            <Card className="p-0 print:break-inside-avoid">
              <Table columns={reportConfig.columns} data={reportConfig.rows} keyField={reportConfig.keyField} />
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Report;