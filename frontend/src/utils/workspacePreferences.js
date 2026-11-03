export const defaultPreferences = {
  name: 'Admin', email: '', phone: '', designation: 'Administrator', company: 'ARTIC9',
  avatar: '', report: 'employees', pageSize: '10', desktopAlerts: false,
  appearance: 'lavender', density: 'comfortable', supportEmail: '',
};

export function readPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem('crm-settings') || '{}');
    return { ...defaultPreferences, ...(stored && typeof stored === 'object' ? stored : {}) };
  } catch { return { ...defaultPreferences }; }
}

export function savePreferences(values) {
  localStorage.setItem('crm-settings', JSON.stringify(values));
  window.dispatchEvent(new Event('preferences-updated'));
}

export function downloadText(filename, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
