import { useState } from 'react';
import { LuX, LuLoaderCircle, LuTriangleAlert, LuCopy, LuCheck, LuKeyRound } from 'react-icons/lu';
import { resetUserPassword } from '../../../services/admin.service.js';

/**
 * Admin-only: force-resets the login password for a caretaker or owner
 * account. `person` needs { id, name }. On success shows the one-time
 * temporary password returned by the backend so the admin can hand it to
 * the user; calls onDone() once the admin closes out of the confirmation.
 */
const ResetPasswordModal = ({ person, onClose, onDone }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await resetUserPassword(person.id);
      setTemporaryPassword(res?.temporaryPassword || null);
    } catch (err) {
      setSubmitError(err.message || "We couldn't reset this password. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the
      // password stays visible on screen either way, so this is non-fatal.
    }
  };

  const handleClose = () => {
    if (temporaryPassword && onDone) onDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Reset Password</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LuX />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {!temporaryPassword ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2.5">
                <LuTriangleAlert className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  This immediately invalidates {person.name}'s current password. They'll need a new
                  one-time password from you to sign in again.
                </span>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50
                             text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
                             hover:bg-brand-800 text-white text-sm font-semibold transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
                  {submitting ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-start gap-2.5">
                <LuKeyRound className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Password reset. Share this one-time password with {person.name} — they'll be asked to
                  change it on next login.
                </span>
              </div>

              <div className="flex items-center gap-2 bg-canvas border border-slate-200 rounded-xl px-4 py-3">
                <code className="flex-1 text-sm font-mono text-slate-900 select-all">{temporaryPassword}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800
                           text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
