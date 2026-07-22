import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LuReceipt, LuTriangleAlert, LuCheck, LuSmartphone } from 'react-icons/lu';
import { formatCurrency, formatDate } from '../../components/constast/Constasts.js';
import { getBill, initiateStkPush, getPaymentStatus } from '../../services/tenant.service.js';
import NyumbaHub from "../../assets/NyumbaHub.png"

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

const PAID_STATUSES = ['paid', 'paid_early', 'paid_late'];

const STATUS_TONE = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  paid_early: { label: 'Paid Early', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  paid_late: { label: 'Paid Late', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  partial: { label: 'Partially Paid', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  unpaid: { label: 'Unpaid', className: 'bg-red-50 text-red-700 border-red-100' },
};

const Shell = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md flex flex-col items-center gap-6"> 
      <img src={NyumbaHub} alt="Nyumba Hub Logo" className="w-32 h-auto" />
      <div className="w-full max-w-md">{children}</div>
         </div>
    
  </div>
);

const Card = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6">{children}</div>
);

const TenantBillPay = () => {
  const { token } = useParams();

  const [pageState, setPageState] = useState('loading'); 
  const [invalidReason, setInvalidReason] = useState('');
  const [bill, setBill] = useState(null);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [payState, setPayState] = useState('idle');
  const [payError, setPayError] = useState('');

  const pollRef = useRef(null);

  const loadBill = useCallback(async () => {
    try {
      const data = await getBill(token);
      setBill(data);
      setPageState('ready');
      console.log('Bill data loaded:', data);
    } catch (err) {
      setInvalidReason(err.message || 'This link is no longer valid.');
      setPageState('invalid');
    }
  }, [token]);

  useEffect(() => {
    loadBill();
  }, [loadBill]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const isPaid = bill && PAID_STATUSES.includes(bill.status);

  const handlePay = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/[^\d]/g, '');
    if (!digits || digits.length < 9) {
      setPhoneError('Enter a valid phone number.');
      return;
    }
    setPhoneError('');
    setPayError('');
    setPayState('initiating');

    try {
      const { paymentId } = await initiateStkPush(token, phone);
      setPayState('waiting');

      pollRef.current = setInterval(async () => {
        try {
          const { status } = await getPaymentStatus(token, paymentId);
          if (status === 'success') {
            clearInterval(pollRef.current);
            setPayState('success');
            await loadBill();
          } else if (status === 'failed') {
            clearInterval(pollRef.current);
            setPayState('failed');
          }
        } catch {
          clearInterval(pollRef.current);
          setPayState('failed');
          setPayError('Lost connection while checking payment status.');
        }
      }, 3000);
    } catch (err) {
      setPayState('idle');
      setPayError(err.message || "Couldn't start the M-Pesa payment. Try again.");
    }
  };

  if (pageState === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-700 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading your bill…</p>
        </div>
      </Shell>
    );
  }

  if (pageState === 'invalid') {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <LuTriangleAlert className="text-2xl text-red-500" aria-hidden="true" />
            </div>
            <h1 className="font-bold text-slate-900">Link no longer valid</h1>
            <p className="text-sm text-slate-500 max-w-xs">
              {invalidReason} Please contact your caretaker for a new link.
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  const tone = STATUS_TONE[bill.status] ?? STATUS_TONE.unpaid;

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <LuReceipt aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {bill.buildingName} · Unit {bill.unitLabel}
            </p>
            <h1 className="text-lg font-bold text-slate-900">{bill.description}</h1>
          </div>
        </div>

        <Card>
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <p className={labelClasses}>Amount Due</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(bill.amount)}</p>
              <p className="text-xs text-slate-400 mt-1">Due {formatDate(bill.dueDate)}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${tone.className}`}>
              {tone.label}
            </span>
          </div>

          {isPaid ? (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-800">
              <LuCheck className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                This bill is settled. A confirmation has been sent to your WhatsApp.
              </p>
            </div>
          ) : payState === 'success' ? (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-800">
              <LuCheck className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p>Payment received. A confirmation has been sent to your WhatsApp.</p>
            </div>
          ) : (
            <form onSubmit={handlePay} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClasses} htmlFor="pay-phone">
                  M-Pesa Phone Number
                </label>
                <input
                  id="pay-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError('');
                  }}
                  disabled={payState === 'initiating' || payState === 'waiting'}
                  className={inputClasses}
                  placeholder="+254 7XX XXX XXX"
                />
                {phoneError && <p className="text-red-500 text-xs">{phoneError}</p>}
              </div>

              {payState === 'waiting' && (
                <div className="flex items-center gap-3 bg-canvas border border-slate-100 rounded-xl px-3.5 py-3 text-xs text-slate-500">
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-brand-700 rounded-full animate-spin shrink-0" />
                  Waiting for M-Pesa confirmation…
                </div>
              )}

              {payState === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-red-700">
                  Payment failed, try again.
                </div>
              )}

              {payError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-red-700">
                  {payError}
                </div>
              )}

              <button
                type="submit"
                disabled={payState === 'initiating' || payState === 'waiting'}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <LuSmartphone aria-hidden="true" />
                {payState === 'initiating'
                  ? 'Starting payment…'
                  : payState === 'waiting'
                  ? 'Confirming…'
                  : payState === 'failed'
                  ? 'Try Again'
                  : 'Pay with M-Pesa'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </Shell>
  );
};

export default TenantBillPay;