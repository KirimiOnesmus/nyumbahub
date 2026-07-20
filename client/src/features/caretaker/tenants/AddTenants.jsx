import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuCircleCheck } from 'react-icons/lu';
import Card from '../../../components/common/Card.jsx';
import { getBuildings } from '../../../services/building.service.js';
import { getUnits } from '../../../services/unit.service.js';
import { createTenant } from '../../../services/tenant.service.js';

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-400';

const PHONE_REGEX = /^(?:0\d{9}|\+254\d{9})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ID_TYPES = [
  { value: 'NationalID', label: 'National ID' },
  { value: 'Passport', label: 'Passport' },
  { value: 'MilitaryID', label: 'Military ID' },
];

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  idType: 'NationalID',
  idNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  buildingId: '',
  unitId: '',
  moveInDate: '',
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

const AddTenants = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingsError, setBuildingsError] = useState('');

  const [vacantUnits, setVacantUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Load the caretaker's assigned buildings once on mount.
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

  // Reload vacant units whenever the selected building changes.
  useEffect(() => {
    let cancelled = false;
    setForm((f) => ({ ...f, unitId: '' }));

    if (!form.buildingId) {
      setVacantUnits([]);
      setUnitsError('');
      return undefined;
    }

    const load = async () => {
      setUnitsLoading(true);
      setUnitsError('');
      try {
        const { units } = await getUnits(form.buildingId, { page: 1, limit: 100 });
        if (!cancelled) setVacantUnits(Array.isArray(units) ? units.filter((u) => u.status === 'vacant') : []);
      } catch (err) {
        if (!cancelled) setUnitsError(err.message || "We couldn't load vacant units for this building.");
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.buildingId]);

  const selectedUnit = vacantUnits.find((u) => u.id === form.unitId);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    if (!form.phone.trim()) next.phone = 'Phone number is required.';
    else if (!PHONE_REGEX.test(form.phone.trim())) next.phone = 'Use format 07XXXXXXXX or +2547XXXXXXXX.';
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email.';
    if (!form.idType) next.idType = 'Select an ID type.';
    if (!form.idNumber.trim()) next.idNumber = 'ID number is required.';
    if (!form.buildingId) next.buildingId = 'Select a building.';
    if (!form.unitId) next.unitId = 'Select a vacant unit.';
    if (!form.moveInDate) next.moveInDate = 'Move-in date is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // monthlyRent is intentionally never sent — rent lives on the Unit only,
      // and the backend's .strict() schema rejects any extra fields.
      await createTenant({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        unitId: form.unitId,
        moveInDate: form.moveInDate,
      });
      setSuccess(true);
      setTimeout(() => navigate('/caretaker/tenants'), 900);
    } catch (err) {
      setSubmitError(err.message || "We couldn't add this tenant. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/caretaker/tenants')}
          aria-label="Back to tenants"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-canvas hover:text-brand-700 transition-colors cursor-pointer"
        >
          <LuArrowLeft />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Add Tenant</h2>
          <p className="text-sm text-slate-500 mt-1">Assign a tenant to a vacant unit.</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3 text-sm text-emerald-800">
          <LuCircleCheck className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p>Tenant added successfully. Redirecting…</p>
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
          <Field label="Full Name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={setField('name')}
              placeholder="Jane Muthoni"
              className={inputClasses}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone Number" required error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={setField('phone')}
                placeholder="0712345678"
                className={inputClasses}
              />
            </Field>
            <Field label="Email (optional)" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="jane@example.com"
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="ID Type" required error={errors.idType}>
              <select value={form.idType} onChange={setField('idType')} className={inputClasses}>
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ID Number" required error={errors.idNumber}>
              <input
                type="text"
                value={form.idNumber}
                onChange={setField('idNumber')}
                placeholder="30123456"
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Emergency Contact Name">
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={setField('emergencyContactName')}
                placeholder="John Doe"
                className={inputClasses}
              />
            </Field>
            <Field label="Emergency Contact Phone">
              <input
                type="tel"
                value={form.emergencyContactPhone}
                onChange={setField('emergencyContactPhone')}
                placeholder="0712345678"
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
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
            <Field label="Unit" required error={errors.unitId || unitsError}>
              {unitsLoading ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-400">
                  <LuLoaderCircle className="animate-spin" aria-hidden="true" />
                  Loading vacant units…
                </div>
              ) : (
                <select
                  value={form.unitId}
                  onChange={setField('unitId')}
                  disabled={!form.buildingId || vacantUnits.length === 0}
                  className={inputClasses}
                >
                  <option value="">
                    {!form.buildingId
                      ? 'Select a building first'
                      : vacantUnits.length === 0
                        ? 'No vacant units'
                        : 'Select a vacant unit'}
                  </option>
                  {vacantUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          {selectedUnit && (
            <p className="text-xs text-slate-400 -mt-2">
              Monthly rent for this unit is set on the Unit itself:{' '}
              <span className="font-semibold text-slate-600">
                KES {Number(selectedUnit.rentAmount).toLocaleString()}
              </span>
              . To change it, edit the unit instead.
            </p>
          )}

          <Field label="Move-in Date" required error={errors.moveInDate}>
            <input type="date" value={form.moveInDate} onChange={setField('moveInDate')} className={inputClasses} />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/caretaker/tenants')}
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
              {submitting ? 'Adding…' : 'Add Tenant'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddTenants;