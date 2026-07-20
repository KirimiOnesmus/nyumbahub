import { useState } from 'react';
import { LuX, LuLoaderCircle, LuTriangleAlert } from 'react-icons/lu';
import { changeUserPhone } from '../../../services/admin.service.js';

const PHONE_REGEX = /^\+254(7|1)\d{8}$/;

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all placeholder:text-slate-400';

const labelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-500';

/**
 * Admin-only: repoints the login phone number for a caretaker or owner
 * account. `person` needs { id, name, phone }. Calls onSaved(newPhone) once
 * the backend confirms the change.
 */
const ChangePhoneModal = ({ person, onClose, onSaved }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const trimmed = phone.trim();
    if (!trimmed) {
      setError('Enter a new phone number.');
      return;
    }
    if (!PHONE_REGEX.test(trimmed)) {
      setError('Enter a valid Kenyan number, e.g. +254712345678.');
      return;
    }
    if (trimmed === person.phone) {
      setError("That's already their current number.");
      return;
    }
    setError(null);

    setSubmitting(true);
    try {
      await changeUserPhone(person.id, trimmed);
      onSaved(trimmed);
    } catch (err) {
      setSubmitError(err.message || "We couldn't update this phone number. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Change Phone Number</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2.5">
            <LuTriangleAlert className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This changes {person.name}'s login number. They'll need the new number to sign in from
              now on — make sure they know before you save.
            </span>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelClasses}>Current Number</label>
            <input type="tel" value={person.phone} disabled className={`${inputClasses} bg-canvas cursor-not-allowed`} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-phone" className={labelClasses}>
              New Phone Number <span className="text-red-400">*</span>
            </label>
            <input
              id="new-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              placeholder="+254712345678"
              className={inputClasses}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </div>

          <div className="flex gap-3 pt-1">
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
              Save Number
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePhoneModal;
