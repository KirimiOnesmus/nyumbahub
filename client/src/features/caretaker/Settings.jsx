import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuUser, LuLock, LuTriangleAlert, LuCheck, LuLoader, LuEye, LuEyeOff } from 'react-icons/lu';
import Card from '../../components/common/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { updateMe, changePassword } from '../../services/auth.service.js';

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelClasses = 'text-xs font-semibold text-slate-500 uppercase tracking-wide';

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 p-5 border-b border-slate-100">
    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-brand-50 text-brand-700 shrink-0">
      <Icon aria-hidden="true" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
  </div>
);


const SaveStatus = ({ status }) => {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <LuLoader className="animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <LuCheck aria-hidden="true" />
        Saved
      </span>
    );
  }
  return null;
};

const PasswordField = ({ id, label, value, onChange, autoComplete, visible, onToggleVisible }) => (
  <div className="flex flex-col gap-1.5">
    <label className={labelClasses} htmlFor={id}>
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className={`${inputClasses} pr-10`}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
      >
        {visible ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
      </button>
    </div>
  </div>
);

const ProfileSection = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }

    setStatus('saving');
    try {
      const trimmedEmail = email.trim();
      const payload = { name: name.trim() };
      if (trimmedEmail) payload.email = trimmedEmail;

      const { user: updated } = await updateMe(payload);
      updateUser(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('idle');
      setError(err.message || "We couldn't save your changes. Try again.");
    }
  };

  const initials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="p-0">
      <SectionHeader icon={LuUser} title="Profile" description="Your personal details as shown to tenants and owners." />
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-lg font-semibold shrink-0">
            {initials || '—'}
          </div>
          <div className="text-sm text-slate-500">
            Caretaker account
            <div className="text-slate-900 font-semibold">{user?.name}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="name">
              Full Name
            </label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses} htmlFor="phone">
              Phone Number
            </label>
            <input id="phone" type="tel" value={user?.phone ?? ''} disabled className={`${inputClasses} bg-canvas`} />
            <p className="text-xs text-slate-400">Used to log in and for WhatsApp — can't be changed here.</p>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClasses} htmlFor="email">
              Email Address
            </label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
            <LuTriangleAlert aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <SaveStatus status={status} />
          <button
            type="submit"
            disabled={status === 'saving'}
            className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer w-fit"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Card>
  );
};

const SecuritySection = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [visibility, setVisibility] = useState({ current: false, next: false, confirm: false });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const toggleVisibility = (field) => setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.current || !form.next || !form.confirm) {
      setError('Please fill in all password fields.');
      return;
    }

    if (form.next.length < 10) {
      setError('New password must be at least 10 characters.');
      return;
    }
    if (!/[A-Z]/.test(form.next) || !/[a-z]/.test(form.next) || !/\d/.test(form.next)) {
      setError('New password needs at least one uppercase letter, one lowercase letter, and one digit.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    setStatus('saving');
    try {
      await changePassword(form.current, form.next);
      setStatus('saved');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setStatus('idle');
      setError(err.message || "We couldn't update your password. Try again.");
    }
  };

  return (
    <Card className="p-0">
      <SectionHeader icon={LuLock} title="Security" description="Update the password used to sign in." />
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <PasswordField
              id="current-password"
              label="Current Password"
              value={form.current}
              onChange={handleChange('current')}
              autoComplete="current-password"
              visible={visibility.current}
              onToggleVisible={() => toggleVisibility('current')}
            />
          </div>
          <PasswordField
            id="new-password"
            label="New Password"
            value={form.next}
            onChange={handleChange('next')}
            autoComplete="new-password"
            visible={visibility.next}
            onToggleVisible={() => toggleVisibility('next')}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            value={form.confirm}
            onChange={handleChange('confirm')}
            autoComplete="new-password"
            visible={visibility.confirm}
            onToggleVisible={() => toggleVisibility('confirm')}
          />
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          At least 10 characters, with an uppercase letter, a lowercase letter, and a digit.
        </p>

        {error && (
          <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
            <LuTriangleAlert aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <SaveStatus status={status} />
          <button
            type="submit"
            disabled={status === 'saving'}
            className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer w-fit"
          >
            Change Password
          </button>
        </div>
      </form>
    </Card>
  );
};

const Settings = () => (
  <div className="flex flex-col gap-6">
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
      <p className="text-sm text-slate-500 mt-1">Manage your account and security.</p>
    </div>

    <ProfileSection />
    <SecuritySection />
  </div>
);

export default Settings;