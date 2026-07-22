import { LuBuilding2, LuDoorOpen, LuWallet, LuTriangleAlert, LuUsers } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';

const currency = (value) => `KES ${value.toLocaleString('en-KE')}`;


const DashboardCards = ({ stats }) => {
  const occupancyPct = Math.round((stats.occupiedUnits / stats.totalUnits) * 100);

  const cards = [
    {
      icon: LuBuilding2,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-700',
      eyebrow: 'Active',
      label: 'Buildings',
      value: stats.activeBuildings,
    },
    {
      icon: LuDoorOpen,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-700',
      eyebrow: `${occupancyPct}%`,
      label: 'Occupied Units',
      value: stats.occupiedUnits,
    },
    {
      icon: LuWallet,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-700',
      badge: stats.revenueGrowthPct != null ? `+${stats.revenueGrowthPct}%` : null,
      badgeTone: 'success',
      label: 'Monthly Revenue',
      value: currency(stats.monthlyRevenue),
    },
    {
      icon: LuTriangleAlert,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      badge: 'Action Req.',
      badgeTone: 'danger',
      label: 'Outstanding Rent',
      value: currency(stats.outstandingRent),
    },
    {
      icon: LuUsers,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-700',
      eyebrow: stats.totalCaretakers,
      label: 'Total Caretakers',
      value: stats.totalCaretakers,
      hideValue: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
              <c.icon className={`text-lg ${c.iconColor}`} aria-hidden="true" />
            </div>
            {c.badge && (
              <span
                className={`text-xs font-bold ${
                  c.badgeTone === 'danger' ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {c.badge}
              </span>
            )}
            {c.eyebrow && !c.badge && (
              <span className="text-xs font-bold text-slate-500">{c.eyebrow}</span>
            )}
          </div> 
          <p className="text-sm text-slate-500">{c.label}</p>
          {!c.hideValue && <p className="text-lg font-bold text-slate-900 mt-0.5">{c.value}</p>}
        </Card>
      ))}
    </div>
  );
};

export default DashboardCards;
