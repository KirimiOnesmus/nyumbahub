import { useNavigate } from 'react-router-dom';
import { LuWallet, LuArrowRight } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';


const Payment = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
        <p className="text-sm text-slate-500 mt-1">M-Pesa and manual payment records.</p>
      </div>

      <Card className="p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-canvas text-slate-400 flex items-center justify-center">
          <LuWallet className="text-2xl" aria-hidden="true" />
        </div>
        <div className="max-w-md">
          <h3 className="font-bold text-slate-900">A cross-building payments list isn't available yet</h3>
          <p className="text-sm text-slate-500 mt-2">
            The backend only exposes payment history per bill, plus manual reconciliation on a specific
            bill — there's no single endpoint that lists every payment across all your buildings. Payment
            status and balances are already visible on each bill.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner/bills')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          Go to Bills
          <LuArrowRight aria-hidden="true" />
        </button>
      </Card>
    </div>
  );
};

export default Payment;
