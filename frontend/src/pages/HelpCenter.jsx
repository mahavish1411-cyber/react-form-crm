import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/WorkspaceIcon';
import { downloadText, readPreferences } from '../utils/workspacePreferences';
import './WorkspacePages.css';

const categories = [
  { id:'getting-started', icon:'rocket', title:'Getting Started', description:'Set up your workspace and manage employees.', color:'purple' },
  { id:'account', icon:'lock', title:'Account & Settings', description:'Manage your profile, preferences, and privacy.', color:'violet' },
  { id:'attendance', icon:'calendar', title:'Attendance & Payroll', description:'Track work hours, breaks, and salary.', color:'pink' },
  { id:'reports', icon:'chart', title:'Reports & Analytics', description:'Understand reports and export your data.', color:'green' },
];
const articles = [
  { id:1, category:'attendance', question:'How do I mark my attendance?', answer:'Open Attendance, select your employee record, and check in when work starts. Use Start Break and End Break for each break, then check out when work ends. Final status is calculated after check-out.', path:'/attendance', action:'Open Attendance' },
  { id:2, category:'getting-started', question:'How can I add a new employee?', answer:'Go to Employees and complete the employee form. Use a unique employee ID and email, and provide the required contact and job information. Select Save to add the employee. Existing records can be updated using Edit.', path:'/employees', action:'Open Employees' },
  { id:3, category:'reports', question:'Can I download reports?', answer:'Yes. Open Reports, choose the month and department, and use the CSV action beside a report. View opens searchable report records. Downloads include all matching records across every page. Employee reports show the current directory.', path:'/reports', action:'Open Reports' },
  { id:4, category:'account', question:'How do I update my profile or password?', answer:'Open Settings → Profile Settings to change your name, photo, contact details and designation. These preferences are stored in this browser. This workspace does not have a sign-in or password service, so there is no password to reset here.', path:'/settings', action:'Open Settings' },
  { id:5, category:'getting-started', question:'Who can I contact for technical support?', answer:'Use Contact Support to prepare a request describing the problem. You can save a draft, download the request, or open your email app once your team’s support email is configured in Settings → Integrations.', support:true },
  { id:6, category:'attendance', question:'How do I generate payroll and print a payslip?', answer:'Open Payroll and select a month. Generate payroll for an employee or all active employees. Review attendance, salary and deductions before marking a payment Paid. Open a payroll record to view and print its payslip. Recalculate after correcting salary or attendance.', path:'/payroll', action:'Open Payroll' },
  { id:7, category:'reports', question:'Why are reports empty or unable to load?', answer:'Check the month, department and search filters. Payroll reports need generated payroll records; attendance reports need recorded check-ins. If loading fails, the backend and database must be reachable. Settings → Integrations has a connection test.', path:'/settings', action:'Check Settings' },
  { id:8, category:'account', question:'How do I change appearance and report defaults?', answer:'Open Settings → Appearance to choose a background and content spacing. Preferences lets you choose the default report and number of report records per page. Save changes to apply. Report defaults apply when you next open Reports.', path:'/settings', action:'Open Settings' },
];

function readDraft() {
  const profile = readPreferences();
  try { return { name:profile.name, email:profile.email, subject:'', details:'', ...JSON.parse(localStorage.getItem('crm-support-draft') || '{}') }; }
  catch { return { name:profile.name, email:profile.email, subject:'', details:'' }; }
}

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState(readDraft);
  const [feedback, setFeedback] = useState('');
  const [supportEmail] = useState(() => readPreferences().supportEmail);
  const dialog = useRef(null);
  const matches = articles.filter(article => (!category || article.category === category) && `${article.question} ${article.answer}`.toLowerCase().includes(search.toLowerCase().trim()));
  const visible = showAll || search || category ? matches : matches.slice(0, 5);

  function openSupport() { setFeedback(''); dialog.current.showModal(); }
  function clearFilters() { setSearch(''); setCategory(''); setShowAll(false); }
  function updateDraft(event) { setDraft(previous => ({ ...previous, [event.target.name]: event.target.value })); setFeedback(''); }
  function submitSupport(event) {
    event.preventDefault();
    const action = event.nativeEvent.submitter?.value || 'draft';
    if (!draft.subject.trim() || !draft.details.trim()) { setFeedback('Enter a subject and describe the issue.'); return; }
    const text = `Workspace support request\n\nName: ${draft.name.trim()}\nEmail: ${draft.email.trim()}\nSubject: ${draft.subject.trim()}\n\n${draft.details.trim()}`;
    if (action === 'download') { downloadText('workspace-support-request.txt', text); setFeedback('Request downloaded. Share this file with your workspace administrator.'); }
    else if (action === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) { setFeedback('Configure your team’s support email in Settings → Integrations first.'); return; }
      window.location.href = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(draft.subject.trim())}&body=${encodeURIComponent(text)}`;
      setFeedback('Your email app will open. Send the request from there.');
    } else {
      try { localStorage.setItem('crm-support-draft', JSON.stringify(draft)); setFeedback('Draft saved in this browser. It has not been sent.'); }
      catch { setFeedback('Could not save the draft. Download the request instead.'); }
    }
  }

  return <div className="crm-page workspace-page help-page"><div className="workspace-container">
    <header className="workspace-heading"><h1>Help Center</h1><p>Find answers, guides, and support for your workspace.</p></header>
    <section className="help-search-banner" aria-label="Search help articles"><div className="help-banner-wave wave-one"/><div className="help-banner-wave wave-two"/><div className="help-banner-wave wave-three"/><h2>How can we help you?</h2><div className="help-search-field"><Icon name="search"/><input aria-label="Search help articles" type="search" placeholder="Search for articles, guides, or topics…" value={search} onChange={event => setSearch(event.target.value)}/></div></section>
    <section className="help-categories" aria-label="Help topics">{categories.map(item => <button key={item.id} type="button" className={`help-category ${category === item.id ? 'active' : ''}`} aria-pressed={category === item.id} onClick={() => { setCategory(previous => previous === item.id ? '' : item.id); setShowAll(true); }}><span className={`category-icon ${item.color}`}><Icon name={item.icon}/></span><strong>{item.title}</strong><span>{item.description}</span></button>)}</section>
    <div className="help-bottom-grid"><section className="workspace-panel faq-panel"><div className="faq-heading"><h2>Frequently Asked Questions</h2><button type="button" className="workspace-text-button" onClick={() => { if (search || category) { clearFilters(); setShowAll(true); } else setShowAll(previous => !previous); }}>{search || category ? 'View All' : showAll ? 'Show Less' : 'View All'}</button></div>
      {(search || category) && <div className="help-results-summary"><span role="status">{matches.length} matching {matches.length === 1 ? 'article' : 'articles'}{category ? ` · ${categories.find(item => item.id === category).title}` : ''}</span><button type="button" className="workspace-text-button" onClick={clearFilters}>Clear filters</button></div>}
      <div className="faq-list">{visible.map(article => <details key={article.id} className="faq-item"><summary><span>{article.question}</span><Icon name="chevron" size={17}/></summary><div className="faq-answer"><p>{article.answer}</p>{article.support ? <button className="workspace-text-button" type="button" onClick={openSupport}>Contact Support <Icon name="arrow" size={15}/></button> : <Link to={article.path}>{article.action} <Icon name="arrow" size={15}/></Link>}</div></details>)}</div>
      {!visible.length && <div className="help-no-results"><Icon name="search" size={30}/><h3>No answers found</h3><p>Try a shorter search or another topic.</p><button className="workspace-button secondary" type="button" onClick={clearFilters}>Clear filters</button></div>}
    </section><aside className="workspace-panel support-panel"><span className="support-icon"><Icon name="headset" size={39}/></span><h2>Still Need Help?</h2><p>Prepare a support request for your workspace administrator.</p><button className="workspace-button" type="button" onClick={openSupport}>Contact Support <Icon name="arrow" size={19}/></button><span className="support-caption">Save a draft or share your request by email.</span></aside></div>
    <p className="help-footer-note">Built for your workflow. Find help for employees, attendance, payroll and reports.</p>
    <dialog ref={dialog} className="support-dialog" aria-labelledby="support-dialog-title" onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}><div className="support-dialog-inner"><div className="support-dialog-heading"><div><h2 id="support-dialog-title">Contact Support</h2><p>Tell your administrator what went wrong.</p></div><button type="button" className="dialog-close" aria-label="Close support request" onClick={() => dialog.current.close()}>×</button></div><form onSubmit={submitSupport}><div className="workspace-form-grid"><label>Your name<input name="name" value={draft.name} onChange={updateDraft} required maxLength={60} autoComplete="name"/></label><label>Your email<input name="email" type="email" value={draft.email} onChange={updateDraft} required maxLength={120} autoComplete="email"/></label></div><label>Subject<input name="subject" value={draft.subject} onChange={updateDraft} required maxLength={150} placeholder="What do you need help with?"/></label><label>Describe the issue<textarea name="details" value={draft.details} onChange={updateDraft} required maxLength={4000} rows={5} placeholder="Include the page, steps to reproduce, and any error message."/></label><p className="workspace-footnote">{supportEmail ? `Email recipient: ${supportEmail}. Your email app sends the message.` : <>No support email configured. Add your team's address in <Link to="/settings" onClick={() => dialog.current.close()}>Settings → Integrations</Link>, or download your request.</>}</p>{feedback && <p className="workspace-feedback" role="status">{feedback}</p>}<div className="workspace-inline-actions support-submit-actions"><button type="submit" value="draft" className="workspace-button secondary">Save Draft</button><button type="submit" value="download" className="workspace-button secondary">Download Request</button>{supportEmail && <button type="submit" value="email" className="workspace-button">Open Email App <Icon name="arrow" size={17}/></button>}</div></form></div></dialog>
  </div></div>;
}
