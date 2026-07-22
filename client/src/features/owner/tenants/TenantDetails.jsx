import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuPhone,
  LuMail,
  LuBuilding2,
  LuCalendar,
  LuUsers,
  LuReceipt,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Table from '../../../components/common/Table.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { getTenantById, moveOutTenant } from '../../../services/tenant.service.js';
import { getBuilding } from '../../../services/building.service.js';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const STATUS_LABELS = { pending: 'Pending', active: 'Active', moved_out: 'Moved Out' };
const STATUS_TONE = { pending: 'warning', active: 'success', moved_out: 'neutral' };

const PAYMENT_STATUS_LABELS = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' };
const PAYMENT_STATUS_TONE = { paid: 'success', pending: 'warning', overdue: 'danger' };

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCurrency = (value) => `KES ${Number(value).toLocaleString('en-KE')}`;

const InfoRow = ({ icon: Icon, label, value }) => (
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

const TenantDetails = () => {
  const { id: tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);

  const [payments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [movingOut, setMovingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getTenantById(tenantId);
        if (cancelled) return;
        const t = res.tenant;
        let buildingName = '';
        try {
          const buildingRes = await getBuilding(t.unitId?.buildingId);
          buildingName = buildingRes.building.name;
        } catch {
          // Non-fatal — the tenant still renders without a building name.
        }
        setTenant({
          id: t.id,
          name: t.userId?.name,
          phone: t.userId?.phone,
          email: t.userId?.email,
          building: { name: buildingName },
          unit: { houseNumber: t.unitId?.unitNumber },
          status: t.status,
          moveInDate: t.moveInDate,
          rentAmount: t.unitId?.rentAmount,
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load this tenant. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const handleMoveOut = async () => {
    if (!window.confirm('Mark this tenant as moved out? This will free up their unit.')) return;
    setMovingOut(true);
    try {
      await moveOutTenant(tenantId);
      setTenant((prev) => ({ ...prev, status: 'moved_out' }));
    } catch (err) {
      setError(err.message || "Couldn't move this tenant out. Try again.");
    } finally {
      setMovingOut(false);
    }
  };

  const paymentColumns = useMemo(
    () => [
      { key: 'period', label: 'Period' },
      { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
      { key: 'paidOn', label: 'Paid On', render: (row) => formatDate(row.paidOn) },
      { key: 'method', label: 'Method' },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <Badge tone={PAYMENT_STATUS_TONE[row.status]}>{PAYMENT_STATUS_LABELS[row.status]}</Badge>,
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/owner/tenants')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer w-fit"
      >
        <LuArrowLeft aria-hidden="true" />
        Back to Tenants
      </button>

      {loading && <Loader label="Loading tenant details…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && !tenant && (
        <Card className="p-0">
          <EmptyState
            icon={LuUsers}
            title="Tenant not found"
            description="This tenant may have been removed, or the link is incorrect."
          />
        </Card>
      )}

      {!loading && !error && tenant && (
        <>
          <Card className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 text-lg font-bold">
                {getInitials(tenant.name)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{tenant.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <LuBuilding2 className="text-slate-400 shrink-0" aria-hidden="true" />
                  {tenant.building.name} · Unit {tenant.unit.houseNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={STATUS_TONE[tenant.status]}>{STATUS_LABELS[tenant.status]}</Badge>
              {tenant.status !== 'moved_out' && (
                <button
                  type="button"
                  onClick={handleMoveOut}
                  disabled={movingOut}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {movingOut ? 'Moving out…' : 'Mark Moved Out'}
                </button>
              )}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            <Card className="p-6 flex flex-col gap-5">
              <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
              <InfoRow icon={LuPhone} label="Phone" value={tenant.phone} />
              <InfoRow icon={LuMail} label="Email" value={tenant.email || 'Not provided'} />
            </Card>

            <Card className="p-6 flex flex-col gap-5">
              <h3 className="text-sm font-bold text-slate-900">Lease Information</h3>
              <InfoRow icon={LuBuilding2} label="Building / Unit" value={`${tenant.building.name} · Unit ${tenant.unit.houseNumber}`} />
              <InfoRow icon={LuCalendar} label="Move-in Date" value={formatDate(tenant.moveInDate)} />
              <InfoRow icon={LuReceipt} label="Monthly Rent" value={formatCurrency(tenant.rentAmount)} />
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900">Payment History</h3>

            <Card className="p-0">
              <EmptyState
                icon={LuReceipt}
                title="See Bills for payment history"
                description="Payment records are viewed per-bill rather than per-tenant — open a bill for this tenant to see its M-Pesa transaction history."
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/owner/bills')}
                    className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Go to Bills
                  </button>
                }
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default TenantDetails;