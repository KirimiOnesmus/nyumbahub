import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuUser, LuLock, LuSettings, LuEye, LuEyeOff, LuLoaderCircle, LuCheck } from 'react-icons/lu';
import Card from '../../components/common/Card.jsx';
import Loader from '../../components/common/Loader.jsx';
import { changePassword } from '../../services/auth.service.js';
import { getSystemConfig, updateSystemConfig } from '../../services/admin.service.js';
import { useAuth } from '../../context/AuthContext.jsx';

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const TABS = [
  { id: 'profile', label: 'Profile', icon: LuUser },
  { id: 'security', label: 'Security', icon: LuLock },
  { id: 'system', label: 'System', icon: LuSettings },
];

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all';

const fieldLabelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-400';

const PasswordInput = ({ id, value, onChange }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} className={`${inputClasses} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
      >
        {visible ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
      </button>
    </div>
  );
};

const ProfileTab = () => {
  const { user } = useAuth();

  return (
    <Card className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold shrink-0">
          {getInitials(user?.name || 'Admin')}
        </div>
        <div>
          <p className="font-bold text-slate-900">{user?.name}</p>
          <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={fieldLabelClasses}>Full Name</label>
          <input type="text" value={user?.name || ''} disabled className={`${inputClasses} mt-1.5 bg-canvas cursor-not-allowed`} />
        </div>
        <div>
          <label className={fieldLabelClasses}>Phone Number</label>
          <input type="tel" value={user?.phone || ''} disabled className={`${inputClasses} mt-1.5 bg-canvas cursor-not-allowed`} />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Your own name and phone can't be edited here. To change an admin account's phone number, that has
        to go through another super admin — this account can change phone numbers for owners and
        caretakers, not for itself.
      </p>
    </Card>
  );
};

const SecurityTab = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      setSaved(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || "We couldn't update your password. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
        <p className="text-xs text-slate-500 mt-1">Use a strong password you don't use elsewhere.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div>
          <label htmlFor="current" className={fieldLabelClasses}>Current Password</label>
          <div className="mt-1.5">
            <PasswordInput id="current" value={form.current} onChange={handleChange('current')} />
          </div>
        </div>
        <div>
          <label htmlFor="next" className={fieldLabelClasses}>New Password</label>
          <div className="mt-1.5">
            <PasswordInput id="next" value={form.next} onChange={handleChange('next')} />
          </div>
        </div>
        <div>
          <label htmlFor="confirm" className={fieldLabelClasses}>Confirm New Password</label>
          <div className="mt-1.5">
            <PasswordInput id="confirm" value={form.confirm} onChange={handleChange('confirm')} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
             hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {saving ? 'Updating…' : 'Update Password'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Password updated</span>}
        </div>
      </form>
    </Card>
  );
};

// System-wide configuration — supportPhone/supportEmail are shown to
// tenants on bill/payment pages; smsSenderId is the sender name on
// outbound SMS. GET/PATCH /admin/system-config doesn't exist on the
// backend yet (see admin.service.js) — this form is built against that
// contract and will start working once it's added server-side.
const SystemTab = () => {
  const [form, setForm] = useState({ supportPhone: '', supportEmail: '', smsSenderId: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const config = await getSystemConfig();
        if (!cancelled) {
          setForm({
            supportPhone: config.supportPhone ?? '',
            supportEmail: config.supportEmail ?? '',
            smsSenderId: config.smsSenderId ?? '',
          });
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "We couldn't load system settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.supportEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.supportEmail.trim())) {
      setSaveError('Enter a valid support email address.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await updateSystemConfig({
        supportPhone: form.supportPhone.trim() || undefined,
        supportEmail: form.supportEmail.trim() || undefined,
        smsSenderId: form.smsSenderId.trim() || undefined,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.message || "We couldn't save system settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading system settings…" />;

  return (
    <Card className="p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Platform Configuration</h3>
        <p className="text-xs text-slate-500 mt-1">
          These values are shown to tenants across the platform — on bill pages, payment receipts, and
          outbound SMS.
        </p>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          {loadError} You can still fill this in — it will save once the backend endpoint is live.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div>
          <label htmlFor="supportPhone" className={fieldLabelClasses}>Support Phone Number</label>
          <input
            id="supportPhone"
            type="tel"
            value={form.supportPhone}
            onChange={handleChange('supportPhone')}
            placeholder="+254712345678"
            className={`${inputClasses} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="supportEmail" className={fieldLabelClasses}>Support Email</label>
          <input
            id="supportEmail"
            type="email"
            value={form.supportEmail}
            onChange={handleChange('supportEmail')}
            placeholder="support@nyumbahub.com"
            className={`${inputClasses} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="smsSenderId" className={fieldLabelClasses}>SMS Sender ID</label>
          <input
            id="smsSenderId"
            type="text"
            value={form.smsSenderId}
            onChange={handleChange('smsSenderId')}
            placeholder="NYUMBAHUB"
            className={`${inputClasses} mt-1.5`}
          />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{saveError}</div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700
             hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {saving && <LuLoaderCircle className="animate-spin" aria-hidden="true" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <LuCheck aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </form>
    </Card>
  );
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your admin account and platform-wide configuration.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
                active ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'system' && <SystemTab />}
    </div>
  );
};

export default Settings;
