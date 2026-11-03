import { useRef, useState } from 'react';
import Icon from '../components/WorkspaceIcon';
import { defaultPreferences, downloadText, readPreferences, savePreferences } from '../utils/workspacePreferences';
import './WorkspacePages.css';

const tabs = [
  ['profile', 'user', 'Profile Settings', 'Update your personal information and profile details.'],
  ['security', 'lock', 'Account & Security', 'Manage the workspace profile stored on this device.'],
  ['notifications', 'bell', 'Notifications', 'Choose how this browser notifies you about saved changes.'],
  ['preferences', 'sliders', 'Preferences', 'Set up your workspace and preferred report view.'],
  ['integrations', 'link', 'Integrations', 'Configure a support contact and check your data connection.'],
  ['appearance', 'palette', 'Appearance', 'Make your workspace feel right for you.'],
];

export default function Settings() {
  const [saved, setSaved] = useState(readPreferences);
  const [values, setValues] = useState(readPreferences);
  const [tab, setTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const upload = useRef(null);
  const active = tabs.find(item => item[0] === tab);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    setMessage(''); setError('');
  }

  function persist(next) {
    try {
      savePreferences(next); setSaved(next); setValues(next);
      setMessage('Your changes have been saved.'); setError('');
      if (next.desktopAlerts && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('Workspace settings saved', { body: 'Your preferences are up to date.' }); } catch { /* The inline confirmation remains available. */ }
      }
    } catch { setError('Could not save your changes. Browser storage may be full or unavailable.'); }
  }

  function save(event) {
    event.preventDefault();
    const next = { ...values, name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), company: values.company.trim(), supportEmail: values.supportEmail.trim() };
    if (!next.name || !next.company) { setError('A full name and company name are required.'); return; }
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) { setError('Enter a valid profile email address.'); return; }
    if (next.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.supportEmail)) { setError('Enter a valid support email address.'); return; }
    if (next.phone && !/^[+\d\s().-]{7,25}$/.test(next.phone)) { setError('Enter a valid phone number with 7–25 characters.'); return; }
    persist(next);
  }

  function changePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Choose a JPG, PNG or WebP image smaller than 1 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setValues(previous => ({ ...previous, avatar: reader.result })); setMessage('Photo ready. Save changes to apply it.'); setError(''); };
    reader.onerror = () => setError('This image could not be read. Please try another file.');
    reader.readAsDataURL(file);
  }

  async function enableNotifications() {
    if (!('Notification' in window)) { setError('Desktop notifications are unavailable in this browser.'); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') { setValues(previous => ({ ...previous, desktopAlerts: true })); setMessage('Notifications allowed. Save changes to enable save confirmations.'); setError(''); }
      else setError('Notifications were not allowed. You can change permission in your browser settings.');
    } catch { setError('Notifications require a supported browser on HTTPS or localhost.'); }
  }

  async function testConnection() {
    setChecking(true); setConnection('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000/api`;
      const response = await fetch(`${base}/employees`, { signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error();
      setConnection('Connected. Employee data is available from your backend.');
    } catch { setConnection('Connection unavailable. Start the backend and verify the configured MongoDB connection.'); }
    finally { clearTimeout(timer); setChecking(false); }
  }

  return <div className="crm-page workspace-page settings-page"><div className="workspace-container">
    <header className="workspace-heading"><h1>Settings</h1><p>Manage your account, preferences, and workspace settings.</p></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {tabs.map(([id, icon, title]) => <button type="button" key={id} className={tab === id ? 'selected' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setMessage(''); setError(''); }}><Icon name={icon}/><span>{title}</span></button>)}
      </nav>
      <section className="settings-content workspace-panel" aria-labelledby="settings-section-title">
        <div className="workspace-section-heading"><h2 id="settings-section-title">{active[2]}</h2><p>{active[3]}</p></div>
        <form onSubmit={save}>
          {tab === 'profile' && <>
            <div className="profile-top-row">
              <div className="profile-photo-area"><div className="profile-photo">{values.avatar ? <img src={values.avatar} alt="Profile preview"/> : <span>{values.name.trim().slice(0, 1).toUpperCase() || 'A'}</span>}<button type="button" className="photo-upload-button" aria-label="Upload profile photo" title="Upload profile photo" onClick={() => upload.current.click()}><Icon name="camera" size={17}/></button></div><button className="workspace-text-button" type="button" onClick={() => upload.current.click()}>Change photo</button>{values.avatar && <button className="workspace-text-button muted" type="button" onClick={() => setValues(previous => ({ ...previous, avatar: '' }))}>Remove photo</button>}<input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Profile image file" className="visually-hidden" onChange={changePhoto}/></div>
              <div className="profile-main-fields"><label>Full Name <em>*</em><input name="name" value={values.name} onChange={update} required maxLength={60} autoComplete="name" placeholder="Your full name"/></label><label>Email Address<input type="email" name="email" value={values.email} onChange={update} maxLength={120} autoComplete="email" placeholder="you@company.com"/></label></div>
            </div>
            <div className="workspace-form-grid"><label>Phone Number<input type="tel" name="phone" value={values.phone} onChange={update} maxLength={25} autoComplete="tel" placeholder="+91 98765 43210"/></label><label>Designation<select name="designation" value={values.designation} onChange={update}>{['Administrator','Project Manager','HR Manager','Team Lead','Employee','Other'].map(role => <option key={role}>{role}</option>)}</select></label></div>
            <p className="workspace-footnote">Profile preferences are saved in this browser. Employee records and sign-in details are managed separately.</p>
          </>}
          {tab === 'security' && <div className="settings-stack">
            <div className="settings-info"><Icon name="lock"/><div><h3>Browser profile privacy</h3><p>This workspace has no sign-in or password service. Profile changes here do not change a password or grant account access.</p></div></div>
            <div className="settings-option"><div><h3>Export your preferences</h3><p>Download your saved workspace profile as a JSON file.</p></div><button type="button" className="workspace-button secondary" onClick={() => downloadText('workspace-preferences.json', JSON.stringify(saved, null, 2), 'application/json')}>Download</button></div>
            <div className="settings-option"><div><h3>Reset this browser profile</h3><p>Restore default preferences. Employee, attendance and payroll data stay in your database.</p></div><button type="button" className="workspace-button danger" onClick={() => setConfirmReset(true)}>Reset profile</button></div>
            {confirmReset && <div className="reset-confirm" role="group" aria-label="Confirm profile reset"><p>Reset your saved profile and preferences on this browser?</p><div className="workspace-inline-actions"><button type="button" className="workspace-button danger" onClick={() => { persist({ ...defaultPreferences }); setConfirmReset(false); }}>Yes, reset profile</button><button type="button" className="workspace-button secondary" onClick={() => setConfirmReset(false)}>Keep profile</button></div></div>}
          </div>}
          {tab === 'notifications' && <div className="settings-stack"><div className="settings-option"><div><h3>Desktop save confirmations</h3><p>Show a browser notification when you save workspace settings. Your browser permission is required.</p></div><input aria-label="Desktop save confirmations" className="workspace-switch" type="checkbox" name="desktopAlerts" checked={values.desktopAlerts} onChange={event => { if (event.target.checked) enableNotifications(); else update(event); }}/></div><div className="settings-info"><Icon name="bell"/><p>Save confirmations also appear directly on this page. No email or push notification service is connected.</p></div></div>}
          {tab === 'preferences' && <><div className="workspace-form-grid"><label>Company name <em>*</em><input name="company" value={values.company} onChange={update} maxLength={80} required autoComplete="organization"/></label><label>Default report<select name="report" value={values.report} onChange={update}><option value="employees">Employees</option><option value="attendance">Attendance</option><option value="payroll">Payroll</option></select></label><label>Report records per page<select name="pageSize" value={values.pageSize} onChange={update}><option value="10">10 records</option><option value="25">25 records</option><option value="50">50 records</option></select></label></div><p className="workspace-footnote">Report defaults apply the next time you open Reports.</p></>}
          {tab === 'integrations' && <div className="settings-stack"><label>Support email<input type="email" name="supportEmail" value={values.supportEmail} onChange={update} maxLength={120} placeholder="Your administrator’s support email"/></label><p className="workspace-footnote">Help Center uses this address to open your email app with a support request. Enter your team's actual support address.</p><div className="settings-option"><div><h3>Employee data connection</h3><p>Check whether the backend can read your employee directory.</p></div><button type="button" className="workspace-button secondary" onClick={testConnection} disabled={checking}>{checking ? 'Checking…' : 'Test connection'}</button></div>{connection && <p className="workspace-feedback" role="status">{connection}</p>}</div>}
          {tab === 'appearance' && <div className="settings-stack"><fieldset className="appearance-options"><legend>Workspace background</legend>{[['lavender','Lavender'],['neutral','Clean white']].map(([value,label]) => <label key={value} className={`appearance-choice ${values.appearance === value ? 'chosen' : ''}`}><span className={`appearance-swatch ${value}`}/><span><input type="radio" name="appearance" value={value} checked={values.appearance === value} onChange={update}/>{label}</span></label>)}</fieldset><label>Content spacing<select name="density" value={values.density} onChange={update}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><p className="workspace-footnote">Save to apply background and spacing across your workspace.</p></div>}
          {error && <p className="workspace-feedback failure" role="alert">{error}</p>}{message && <p className="workspace-feedback success" role="status"><Icon name="check" size={17}/>{message}</p>}
          {tab !== 'security' && <div className="settings-form-footer"><span>{dirty ? 'You have unsaved changes' : 'All changes saved'}</span><div className="workspace-inline-actions"><button type="button" className="workspace-button secondary" onClick={() => { setValues({ ...saved }); setError(''); setMessage('Unsaved changes discarded.'); }}>Cancel</button><button className="workspace-button" type="submit">Save Changes</button></div></div>}
        </form>
      </section>
    </div>
  </div></div>;
}
