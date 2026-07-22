import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { LuArrowLeft, LuUserRound, LuDoorOpen, LuWallet, LuCalendar, LuHash } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Shell from '../../../components/common/Shell.jsx';
import { formatCurrency, formatDate } from '../../../components/constast/Constasts.js';

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


const PaymentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const payment = location.state?.payment ?? null;
  const paymentMatchesRoute = payment && String(payment.id) === String(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/caretaker/payments')}
          aria-label="Back to payments"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
        >
          <LuArrowLeft />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payment Details</h2>
          <p className="text-sm text-slate-500 mt-1">Full record of a single payment.</p>
        </div>
      </div>

      <Shell
        loading={false}
        error={null}
        isEmpty={!paymentMatchesRoute}
        emptyIcon={LuWallet}
        emptyTitle="Open this payment from the list"
        emptyDescription="Payment details aren't available on a direct link or after a refresh — the API only exposes a bounded recent-payments list, not lookup-by-id. Go back to Payments and click View on the row you're after."
      >
        {paymentMatchesRoute && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900">{formatCurrency(payment.amount)}</p>
              <Badge tone="success">{payment.method}</Badge>
            </div>

            <Card className="p-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <InfoRow icon={LuUserRound} label="Tenant" value={payment.tenantName ?? '—'} />
                <InfoRow icon={LuDoorOpen} label="Unit" value={payment.unitNumber ?? '—'} />
                <InfoRow icon={LuCalendar} label="Paid On" value={formatDate(payment.paidOn)} />
                <InfoRow icon={LuHash} label="M-Pesa Receipt" value={payment.mpesaReceiptNumber || '—'} />
              </div>
            </Card>

            {payment.tenantId && (
              <button
                type="button"
                onClick={() => navigate(`/caretaker/tenants/${payment.tenantId}`)}
                className="self-start flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline transition-colors cursor-pointer"
              >
                View tenant profile →
              </button>
            )}
          </div>
        )}
      </Shell>
    </div>
  );
};

export default PaymentDetails;