import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuUsers, LuBuilding2, LuArrowRight } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import DashboardCards from './DashboardCards.jsx';
import { getAdminOverview } from '../../../services/admin.service.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const QuickAction = ({ icon: Icon, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 bg-white text-left
               hover:border-brand-700 transition-colors cursor-pointer"
  >
    <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
      <Icon className="text-lg" aria-hidden="true" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-0.5">{description}</p>
    </div>
    <LuArrowRight className="text-slate-300 shrink-0" aria-hidden="true" />
  </button>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getAdminOverview();
        if (!cancelled) setStats(res);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't load the overview. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}</h2>
        <p className="text-sm text-slate-500 mt-1">A system-wide view of every owner and caretaker account.</p>
      </div>

      {loading && <Loader label="Loading overview…" />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && stats && <DashboardCards stats={stats} />}

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <QuickAction
            icon={LuBuilding2}
            title="Add Owner"
            description="Onboard a new property owner account."
            onClick={() => navigate('/admin/owners')}
          />
          <QuickAction
            icon={LuUsers}
            title="Add Caretaker"
            description="Create a caretaker and assign them to a building."
            onClick={() => navigate('/admin/caretakers')}
          />
        </div>
      </div>

      <Card className="p-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-canvas text-slate-500 flex items-center justify-center shrink-0">
          <LuPlus aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">You can't add tenants directly</p>
          <p className="text-sm text-slate-500 mt-1">
            Tenants are added by caretakers, or they self-onboard through an invite link generated for a
            vacant unit. As the super admin, your job is managing owner and caretaker accounts, not tenants.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
