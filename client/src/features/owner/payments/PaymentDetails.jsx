import { useNavigate } from 'react-router-dom';
import { LuWallet, LuArrowLeft } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';

/**
 * Same gap as Payment.jsx — no standalone GET /payments/:id endpoint
 * exists. Payment records only exist scoped to a bill (GET /bills/:id/payments).
 */
const PaymentDetails = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/owner/payments')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer w-fit"
      >
        <LuArrowLeft aria-hidden="true" />
        Back to Payments
      </button>

      <Card className="p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-canvas text-slate-400 flex items-center justify-center">
          <LuWallet className="text-2xl" aria-hidden="true" />
        </div>
        <div className="max-w-md">
          <h3 className="font-bold text-slate-900">Not available yet</h3>
          <p className="text-sm text-slate-500 mt-2">
            There's no standalone payment-detail endpoint — payment records only exist scoped to a
            specific bill. Open the bill itself to see its M-Pesa transaction history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner/bills')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          Go to Bills
        </button>
      </Card>
    </div>
  );
};

export default PaymentDetails;
