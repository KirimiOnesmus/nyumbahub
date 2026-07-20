import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createOwner } from '../../../services/owner.service.js';

const PHONE_REGEX = /^\+254(7|1)\d{8}$/;

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-500';

const AddOwner = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [createdOwner, setCreatedOwner] = useState(null);
  const [createdTempPassword, setCreatedTempPassword] = useState(null);

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!phone.trim()) next.phone = 'Phone number is required.';
    else if (!PHONE_REGEX.test(phone.trim())) next.phone = 'Enter a valid Kenyan number, e.g. +254712345678.';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { owner: created, tempPassword } = await createOwner({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      // Same pattern as caretaker creation — the temp password is shown
      // once here and must be relayed out-of-band (SMS/WhatsApp call).
      setCreatedOwner(created);
      setCreatedTempPassword(tempPassword);
    } catch (err) {
      setSubmitError(err.message || "We couldn't add this owner. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {createdTempPassword ? (
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden p-6 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-bold text-slate-900">Owner added</h2>
          <p className="text-sm text-slate-600">
            Share this temporary password with {createdOwner?.name} through a secure, out-of-band
            channel (SMS or WhatsApp call, not email). It won't be shown again.
          </p>
          <div className="bg-canvas border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-900 select-all">
            {createdTempPassword}
          </div>
          <button
            type="button"
            onClick={() => onSaved(createdOwner)}
            className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <h2 className="font-bold text-slate-900">Add Owner</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <LuX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ow-name" className={labelClasses}>
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="ow-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grace Wanjiru"
                  className={inputClasses}
                />
                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ow-phone" className={labelClasses}>
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  id="ow-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254712345678"
                  className={inputClasses}
                />
                {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ow-email" className={labelClasses}>
                  Email <span className="text-slate-400 normal-case font-normal">(optional)</span>
                </label>
                <input
                  id="ow-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="grace.wanjiru@example.com"
                  className={inputClasses}
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-1 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50
                           text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                           hover:bg-brand-800 text-white text-sm font-semibold transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
                Add Owner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddOwner;
