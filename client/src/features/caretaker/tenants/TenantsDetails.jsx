import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LuArrowLeft,
  LuPhone,
  LuMail,
  LuDoorOpen,
  LuCalendar,
  LuWallet,
  LuCirclePlus,
  LuUserRound,
} from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { formatCurrency, formatDate } from '../../../components/constast/Constasts.js';
import { getTenantById } from '../../../services/tenant.service.js';

const STATUS_TONE = { active: 'success', pending: 'warning', moved_out: 'default' };
const STATUS_LABEL = { active: 'Active', pending: 'Pending', moved_out: 'Moved Out' };

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center text-slate-500 shrink-0">
      <Icon aria-hidden="true" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const TenantsDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { tenant: found } = await getTenantById(id);
        if (!cancelled) setTenant(found ?? null);
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
  }, [id]);

  const BackButton = (
    <button
      type="button"
      onClick={() => navigate('/caretaker/tenants')}
      aria-label="Back to tenants"
      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
    >
      <LuArrowLeft />
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{BackButton}</div>
        <Loader label="Loading tenant…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{BackButton}</div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">{BackButton}</div>
        <Card className="p-0">
          <EmptyState
            icon={LuUserRound}
            title="Tenant not found"
            description="This tenant may have moved out or the link is outdated."
          />
        </Card>
      </div>
    );
  }

  const user = tenant.userId ?? {};
  const unit = tenant.unitId ?? {};

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {BackButton}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{user.name ?? 'Unknown tenant'}</h2>
              <Badge tone={STATUS_TONE[tenant.status] ?? 'default'}>
                {STATUS_LABEL[tenant.status] ?? tenant.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">Unit {unit.unitNumber ?? '—'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/caretaker/payments/add', { state: { tenantId: tenant.id, unitId: unit.id } })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0"
        >
          <LuCirclePlus aria-hidden="true" />
          Record Payment
        </button>
      </div>

      <Card className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <InfoRow icon={LuPhone} label="Phone" value={user.phone ?? '—'} />
          <InfoRow icon={LuMail} label="Email" value={user.email || '—'} />
          <InfoRow icon={LuDoorOpen} label="Unit" value={unit.unitNumber ?? '—'} />
          <InfoRow
            icon={LuCalendar}
            label="Move-in Date"
            value={tenant.moveInDate ? formatDate(tenant.moveInDate) : '—'}
          />
          <InfoRow
            icon={LuWallet}
            label="Monthly Rent"
            value={unit.rentAmount != null ? formatCurrency(unit.rentAmount) : '—'}
          />
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-4">Payment History</h3>
    
        <Card className="p-0">
          <EmptyState
            icon={LuWallet}
            title="Payment history isn't available yet"
            description="This view needs a backend endpoint for per-tenant payments."
          />
        </Card>
      </div>
    </div>
  );
};

export default TenantsDetails;