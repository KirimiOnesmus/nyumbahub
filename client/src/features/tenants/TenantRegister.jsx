import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LuBuilding2, LuCheck, LuTriangleAlert } from 'react-icons/lu';
import { getInviteLink, onboardTenant } from '../../services/tenant.service';
import NyumbaHub from "../../assets/NyumbaHub.png"

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

const Shell = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      <img src={NyumbaHub} alt="Nyumba Hub Logo" className="w-32 h-auto" />
      <div className="w-full ">{children}</div>
    </div>
  </div>
);
 

const Card = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6">{children}</div>
);

const ID_TYPES = [
  { value: 'NationalID', label: 'National ID' },
  { value: 'Passport', label: 'Passport' },
  { value: 'MilitaryID', label: 'Military ID' },
];

const emptyForm = { fullName: '', phone: '', email: '', idType: 'NationalID', idNumber: '' };
const emptyErrors = { fullName: '', phone: '', idNumber: '' };

const TenantRegister = () => {
  const { inviteToken } = useParams();

  const [stage, setStage] = useState('validating'); 
  const [invite, setInvite] = useState(null);
  const [invalidReason, setInvalidReason] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState(emptyErrors);
  const [submitError, setSubmitError] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState('');

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      try {
        const data = await getInviteLink(inviteToken);
        if (!cancelled) {
          setInvite(data);
          setStage('form');
        }
      } catch (err) {
        if (!cancelled) {
          setInvalidReason(err.message || 'This link is no longer valid.');
          setStage('invalid');
        }
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const next = { ...emptyErrors };
    if (!form.fullName.trim()) next.fullName = 'Full name is required.';
    const digits = form.phone.replace(/[^\d]/g, '');
    if (!digits) next.phone = 'Phone number is required.';
    else if (digits.length < 9) next.phone = 'Enter a valid phone number.';
    if (!form.idNumber.trim()) next.idNumber = 'ID number is required.';
    setErrors(next);
    return !next.fullName && !next.phone && !next.idNumber;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitError('');
    setStage('submitting');
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone,
        idType: form.idType,
        idNumber: form.idNumber.trim(),
      };
      if (form.email.trim()) {
        payload.email = form.email.trim();
      }
      const result = await onboardTenant(inviteToken, payload);
      setRegisteredPhone(result.phone);
      setStage('success');
    } catch (err) {
      setSubmitError("We couldn't complete your registration. Please try again.");
      setStage('form');
    }
  };

  if (stage === 'validating') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-700 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Checking your invite link…</p>
        </div>
      </Shell>
    );
  }

  if (stage === 'invalid') {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <LuTriangleAlert className="text-2xl text-red-500" aria-hidden="true" />
            </div>
            <h1 className="font-bold text-slate-900">Link no longer valid</h1>
            <p className="text-sm text-slate-500 max-w-xs">
              {invalidReason} Please contact your caretaker for a new invite link.
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  if (stage === 'success') {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <LuCheck className="text-2xl text-emerald-600" aria-hidden="true" />
            </div>
            <h1 className="font-bold text-slate-900">You're registered</h1>
            <p className="text-sm text-slate-500 max-w-xs">
              You'll receive your rent and bill notifications on WhatsApp at{' '}
              <span className="font-semibold text-slate-700">{registeredPhone}</span>.
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <LuBuilding2 aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {invite?.buildingName}
            </p>
            <h1 className="text-lg font-bold text-slate-900">Complete your registration</h1>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="rounded-xl bg-canvas border border-slate-100 px-3.5 py-2.5 text-xs text-slate-500">
              You're joining <span className="font-semibold text-slate-700">{invite?.buildingName}</span>
              , unit <span className="font-semibold text-slate-700">{invite?.unitLabel}</span>.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="fullName">
                Full Name <span className="normal-case font-normal text-red-400">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={updateField('fullName')}
                disabled={stage === 'submitting'}
                className={inputClasses}
                placeholder="e.g. Jane Wanjiru"
              />
              {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="phone">
                WhatsApp / Phone Number <span className="normal-case font-normal text-red-400">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={updateField('phone')}
                disabled={stage === 'submitting'}
                className={inputClasses}
                placeholder="+254 7XX XXX XXX"
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClasses} htmlFor="idType">
                  ID Type <span className="normal-case font-normal text-red-400">*</span>
                </label>
                <select
                  id="idType"
                  value={form.idType}
                  onChange={updateField('idType')}
                  disabled={stage === 'submitting'}
                  className={inputClasses}
                >
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClasses} htmlFor="idNumber">
                  ID Number <span className="normal-case font-normal text-red-400">*</span>
                </label>
                <input
                  id="idNumber"
                  type="text"
                  value={form.idNumber}
                  onChange={updateField('idNumber')}
                  disabled={stage === 'submitting'}
                  className={inputClasses}
                  placeholder="e.g. 12345678"
                />
                {errors.idNumber && <p className="text-red-500 text-xs">{errors.idNumber}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClasses} htmlFor="email">
                Email <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={updateField('email')}
                disabled={stage === 'submitting'}
                className={inputClasses}
                placeholder="jane@email.com"
              />
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-red-700">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={stage === 'submitting'}
              className="w-full mt-1 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {stage === 'submitting' ? 'Submitting…' : 'Complete Registration'}
            </button>
          </form>
        </Card>
      </div>
    </Shell>
  );
};

export default TenantRegister;