import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuCircleCheck } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import { getBuildings } from '../../../services/building.service.js';
import { createUnit } from '../../../services/unit.service.js';

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-400';

const UNIT_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'bedsitter', label: 'Bedsitter' },
  { value: 'studio', label: 'Studio' },
  { value: 'shop', label: 'Shop' },
  { value: 'oneBedroom', label: '1 Bedroom' },
  { value: 'twoBedroom', label: '2 Bedroom' },
  { value: 'threeBedroom', label: '3 Bedroom' },
  { value: 'fourBedroomPlus', label: '4+ Bedroom' },
];

const INITIAL_FORM = {
  unitNumber: '',
  buildingId: '',
  type: '',
  monthlyRent: '',
};

const Field = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelClasses}>
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

const AddUnit = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingsError, setBuildingsError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBuildingsLoading(true);
      setBuildingsError('');
      try {
        const { buildings: list } = await getBuildings({ page: 1, limit: 100 });
        if (!cancelled) setBuildings(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setBuildingsError(err.message || "We couldn't load your buildings.");
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const validate = () => {
    const next = {};
    if (!form.unitNumber.trim()) next.unitNumber = 'Unit number is required.';
    if (!form.buildingId) next.buildingId = 'Select a building.';
    if (!form.type) next.type = 'Select a unit type.';
    if (!form.monthlyRent || Number(form.monthlyRent) <= 0) next.monthlyRent = 'Enter a valid rent amount.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
   
      await createUnit(form.buildingId, {
        unitNumber: form.unitNumber.trim(),
        type: form.type,
        monthlyRent: Number(form.monthlyRent),
      });
      setSuccess(true);
      setTimeout(() => navigate('/caretaker/units'), 900);
    } catch (err) {
      setSubmitError(err.message || "We couldn't add this unit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/caretaker/units')}
          aria-label="Back to units"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
        >
          <LuArrowLeft />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Add Unit</h2>
          <p className="text-sm text-slate-500 mt-1">Register a new unit in one of your buildings.</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-800">
          <LuCircleCheck className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p>Unit added successfully. Redirecting…</p>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{submitError}</div>
      )}

      {buildingsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{buildingsError}</div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Unit Number" required error={errors.unitNumber}>
              <input
                type="text"
                value={form.unitNumber}
                onChange={setField('unitNumber')}
                placeholder="A3"
                className={inputClasses}
              />
            </Field>
            <Field label="Building" required error={errors.buildingId}>
              <select
                value={form.buildingId}
                onChange={setField('buildingId')}
                disabled={buildingsLoading}
                className={inputClasses}
              >
                <option value="">{buildingsLoading ? 'Loading buildings…' : 'Select a building'}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Unit Type" required error={errors.type}>
              <select value={form.type} onChange={setField('type')} className={inputClasses}>
                <option value="">Select a type</option>
                {UNIT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monthly Rent (KES)" required error={errors.monthlyRent}>
              <input
                type="number"
                min="0"
                value={form.monthlyRent}
                onChange={setField('monthlyRent')}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="18000"
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/caretaker/units')}
              disabled={submitting}
              className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-canvas text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
              {submitting ? 'Adding…' : 'Add Unit'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddUnit;