import { useState } from 'react';
import { LuTriangleAlert, LuClock, LuDroplets, LuBuilding2 } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import RevenueChart from '../../../components/charts/RevenueChart.jsx';

const RANGE_OPTIONS = ['Jan 2026 - Jun 2026', 'Jul 2025 - Dec 2025', 'Year to date'];

const MAINTENANCE_ICONS = {
  water: LuDroplets,
  building: LuBuilding2,
};

const RevenueOverview = ({ revenue, delinquency, maintenance }) => {
  const [range, setRange] = useState(RANGE_OPTIONS[0]);

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h3 className="font-bold text-slate-900">Revenue Growth</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Performance overview for the last 6 months
            </p>
          </div>
          <label className="sr-only" htmlFor="revenue-range">
            Date range
          </label>
          <select
            id="revenue-range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-sm font-medium text-slate-600 bg-canvas border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <RevenueChart data={revenue} />
      </Card>

      <div className="flex flex-col gap-5">
        {delinquency?.count > 0 && (
          <Card className="p-5 bg-red-50 border-red-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <LuTriangleAlert className="text-red-600" aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Urgent Action Needed</h4>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {delinquency.count} units in {delinquency.buildingName} are over{' '}
                  {delinquency.daysLate} days late on rent payments.
                </p>
                <button
                  type="button"
                  className="text-sm font-semibold text-red-600 hover:underline mt-2 transition-colors"
                >
                  Review Delinquencies
                </button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <LuClock className="text-brand-700" aria-hidden="true" />
            <h4 className="font-bold text-slate-900 text-sm">Upcoming Maintenance</h4>
          </div>
          <ul className="space-y-4">
            {maintenance.map((item) => {
              const Icon = MAINTENANCE_ICONS[item.kind] ?? LuBuilding2;
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Icon className="text-brand-700 text-sm" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {item.location} • {item.when}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default RevenueOverview;
