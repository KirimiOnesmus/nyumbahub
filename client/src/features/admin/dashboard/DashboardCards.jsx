import { LuBuilding2, LuUsers, LuUserCog, LuUserRound } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';


const DashboardCards = ({ stats }) => {
  const cards = [
    {
      icon: LuBuilding2,
      eyebrow: `${stats.activeOwners} active`,
      label: 'Owners',
      value: stats.totalOwners,
    },
    {
      icon: LuUsers,
      eyebrow: `${stats.activeCaretakers} active`,
      label: 'Caretakers',
      value: stats.totalCaretakers,
    },
    {
      icon: LuUserCog,
      label: 'Buildings',
      value: stats.totalBuildings,
    },
    {
      icon: LuUserRound,
      label: 'Tenants',
      value: stats.totalTenants,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-50">
              <c.icon className="text-lg text-brand-700" aria-hidden="true" />
            </div>
            {c.eyebrow && <span className="text-xs font-bold text-slate-500">{c.eyebrow}</span>}
          </div>
          <p className="text-sm text-slate-500">{c.label}</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{c.value}</p>
        </Card>
      ))}
    </div>
  );
};

export default DashboardCards;
