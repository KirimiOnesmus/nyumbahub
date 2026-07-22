import { useState } from 'react';
import {
  LuUser,
  LuLock,
  LuBell,
  LuBuilding2,
  LuSmartphone,
  LuMessageCircle,
  LuCircleAlert,
  LuEye,
  LuEyeOff,
} from 'react-icons/lu';
import Card from '../../components/common/Card.jsx';
import { changePassword } from '../../services/auth.service.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

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
  { id: 'notifications', label: 'Notifications', icon: LuBell },
  { id: 'business', label: 'Business', icon: LuBuilding2 },
];

const inputClasses =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none ' +
  'focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 transition-all';

const fieldLabelClasses = 'text-xs font-semibold uppercase tracking-widest text-slate-400';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${
      checked ? 'bg-brand-700 justify-end' : 'bg-slate-200 justify-start'
    }`}
  >
    <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
  </button>
);

const PasswordInput = ({ id, value, onChange }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className={`${inputClasses} pr-11`}
      />
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

const PreferenceRow = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

const NotAvailableNotice = ({ children }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2.5">
    <LuCircleAlert className="shrink-0 mt-0.5" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

const ProfileTab = () => {
  const { user } = useAuth();

  return (
    <Card className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold shrink-0">
          {getInitials(user?.name || 'Owner')}
        </div>
        <div>
          <p className="font-bold text-slate-900">{user?.name}</p>
          <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
        </div>
      </div>

      <NotAvailableNotice>
        Editing your name or phone isn't available yet — there's no profile-update endpoint on the
        backend. This shows your current account details from your last login.
      </NotAvailableNotice>

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
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
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


const NotificationsTab = () => {
  const prefs = {
    paymentReceived: true,
    overdueTenants: true,
    announcementSentByCaretaker: false,
    weeklyPortfolioSummary: true,
  };

  return (
    <Card className="p-6 flex flex-col gap-2">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-slate-900">WhatsApp Notification Preferences</h3>
        <p className="text-xs text-slate-500 mt-1">Choose which updates you personally want to be notified about.</p>
      </div>

      <NotAvailableNotice>
        Not available yet — there's no notification-preferences endpoint on the backend. These toggles
        reflect the default behavior and can't be changed here.
      </NotAvailableNotice>

      <div className="opacity-60 pointer-events-none mt-2">
        <PreferenceRow
          title="Payment received"
          description="Get notified when any tenant makes a payment."
          checked={prefs.paymentReceived}
          onChange={() => {}}
        />
        <PreferenceRow
          title="Overdue tenants"
          description="Get a daily summary of tenants past their due date."
          checked={prefs.overdueTenants}
          onChange={() => {}}
        />
        <PreferenceRow
          title="Caretaker announcements"
          description="Get notified when a caretaker sends an announcement."
          checked={prefs.announcementSentByCaretaker}
          onChange={() => {}}
        />
        <PreferenceRow
          title="Weekly portfolio summary"
          description="A weekly recap of revenue, occupancy, and overdue tenants."
          checked={prefs.weeklyPortfolioSummary}
          onChange={() => {}}
        />
      </div>
    </Card>
  );
};

const BusinessTab = () => (
  <div className="flex flex-col gap-5">
    <NotAvailableNotice>
      Not available yet — there's no API endpoint that reports M-Pesa or WhatsApp connection status.
    </NotAvailableNotice>

    <Card className="p-6 flex flex-col gap-4 opacity-60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-canvas text-slate-500 flex items-center justify-center shrink-0">
          <LuSmartphone aria-hidden="true" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">M-Pesa (Daraja API)</h3>
      </div>
      <p className="text-xs text-slate-400">
        M-Pesa payments are already working (see Bills — tenants can pay via STK push). Credentials
        themselves live only in server-side environment variables and are never exposed to the frontend,
        by design.
      </p>
    </Card>

    <Card className="p-6 flex flex-col gap-4 opacity-60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-canvas text-slate-500 flex items-center justify-center shrink-0">
          <LuMessageCircle aria-hidden="true" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">WhatsApp Business Account</h3>
      </div>
      <p className="text-xs text-slate-400">
        Used for tenant announcements (see Notifications). Connection details aren't exposed via any API.
      </p>
    </Card>
  </div>
);

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your profile, security, and business preferences.</p>
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
                active
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
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
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'business' && <BusinessTab />}
    </div>
  );
};

export default Settings;