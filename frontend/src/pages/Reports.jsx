import { useEffect, useState } from 'react';
import axios from 'axios';
import './Reports.css';
import { readPreferences } from '../utils/workspacePreferences';

const number = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const currentMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const reports = {
 employees: { title:'Employee Report', columns:['employeeId','name','department','designation','status'] },
 attendance: { title:'Attendance Report', columns:['date','name','department','finalStatus','workingMinutes'] },
 payroll: { title:'Payroll Report', columns:['name','department','grossSalary','totalDeduction','netSalary','paymentStatus'] },
};
const labels = {employeeId:'Employee ID',name:'Employee',department:'Department',designation:'Designation',status:'Status',date:'Date',finalStatus:'Attendance',workingMinutes:'Work minutes',grossSalary:'Gross (INR)',totalDeduction:'Deductions (INR)',netSalary:'Net (INR)',paymentStatus:'Payment'};
export default function Reports() {
 const [pageSize]=useState(()=>{const value=Number(readPreferences().pageSize);return [10,25,50].includes(value)?value:10;});
 const [month,setMonth]=useState(currentMonth);
 const [data,setData]=useState({employees:[],attendance:[],payroll:[]});
 const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 const [refresh,setRefresh]=useState(0); const [view,setView]=useState(()=>{try{const type=JSON.parse(localStorage.getItem('crm-settings'))?.report;return reports[type]?type:null;}catch{return null;}});
 const [search,setSearch]=useState(''); const [department,setDepartment]=useState(''); const [page,setPage]=useState(1);
 useEffect(()=>{
  const controller=new AbortController(); const base=import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  Promise.all(['employees','attendance/monthly','payroll'].map(path=>axios.get(`${base}/${path}`,{params:path==='employees'?{}:{month},signal:controller.signal}))).then(([e,a,p])=>{
   const directory=new Map((e.data.data || []).map(employee=>[employee._id,employee]));
   const normalize=rows=>rows.map(r=>{const employee=directory.get(r.employee?._id || r.employee) || r.employee || {};return {...r,name:employee.name || 'Deleted employee',department:employee.department || 'Unassigned',finalStatus:r.finalStatus || 'In progress'};});
   setData({employees:e.data.data || [],attendance:normalize(a.data.data || []),payroll:normalize(p.data.data || [])});setLoading(false);setError('');
  }).catch(e=>{if(!controller.signal.aborted){setLoading(false);setError(e.response?.data?.message || 'Unable to load reports. Check the backend and database connection, then retry.');}});
  return ()=>controller.abort();
 },[month,refresh]);
 function reload(){setLoading(true);setError('');setRefresh(n=>n+1);}
 const match=r=>!department || r.department===department;
 const attendance=data.attendance.filter(match), employees=data.employees.filter(match), payroll=data.payroll.filter(match);
 const statuses=['Present','Late','Half Day','In progress']; const colors=['#1595ff','#ffbd18','#a855f7','#94a3b8'];
 const counts=statuses.map(s=>attendance.filter(r=>r.finalStatus===s).length);
 const hours=attendance.reduce((sum,r)=>sum+Number(r.workingMinutes || 0),0)/60;
 const paid=payroll.filter(r=>r.paymentStatus==='Paid').length;
 const weekly=[0,1,2,3,4].map(w=>attendance.filter(r=>Math.floor((Number(r.date?.slice(-2))-1)/7)===w).reduce((sum,r)=>sum+Number(r.workingMinutes || 0)/60,0));
 let start=0; const gradient=counts.map((count,i)=>{const from=start;start+=attendance.length?count/attendance.length*100:0;return `${colors[i]} ${from}% ${start}%`;}).join(',');
 const unavailable=loading || !!error; const metric=n=>unavailable?'—':n;
 const filtered=view?data[view].filter(match).filter(r=>reports[view].columns.some(k=>String(r[k]??'').toLowerCase().includes(search.toLowerCase()))):[];
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize)), currentPage=Math.min(page,pages);
 function download(type){
  const rows=data[type].filter(match).filter(r=>view!==type || reports[type].columns.some(k=>String(r[k]??'').toLowerCase().includes(search.toLowerCase())));
  const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"'; const cols=reports[type].columns;
  const csv=[cols.map(k=>cell(labels[k])).join(','),...rows.map(r=>cols.map(k=>cell(r[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${type}-${type==='employees'?'current':month}.csv`;link.click();URL.revokeObjectURL(url);
 }
 return <div className="crm-page reports-page"><div className="crm-container">
  <header className="reports-header"><div><h1>Reports</h1><p>Analyze attendance, review payroll, and explore your workforce.</p></div><div className="reports-actions"><label>Month<input type="month" value={month} onChange={e=>{if(e.target.value){setMonth(e.target.value);setLoading(true);setView(null);}}}/></label><button className="report-button" disabled={unavailable || !payroll.length} onClick={()=>download('payroll')}>↓ Export Payroll</button><button className="report-button light" disabled={loading} onClick={reload}>Refresh</button></div></header>
  <div className="reports-filter"><label>Department <select value={department} onChange={e=>{setDepartment(e.target.value);setPage(1);}}><option value="">All departments</option>{[...new Set(data.employees.map(e=>e.department).filter(Boolean))].sort().map(d=><option key={d}>{d}</option>)}</select></label><span>Employee data is current. Attendance and payroll use the selected month.</span></div>
  {loading&&<p role="status" className="report-message">Loading reports…</p>}{error&&<div role="alert" className="report-message error"><p>{error}</p><button className="report-button" onClick={reload}>Try again</button></div>}
  <section className="report-stats" aria-label="Report summary">{[['♙',metric(employees.length),'Employees','Current workforce'],['✓',metric(counts[0]+counts[1]+counts[2]),'Completed attendance','Checked-out records'],['▣',metric(payroll.length),'Payroll records','Generated this month'],['◷',metric(`${number(hours)} hrs`),'Total work hours','Recorded working time']].map(([icon,value,title,note],i)=><article className={`report-stat tone-${i}`} key={title}><span className="report-stat-icon">{icon}</span><strong>{value}</strong><span>{title}</span><small>{note}</small></article>)}</section>
  <section className="report-charts">
   <article className="report-panel"><h2>Attendance Overview</h2><div className="report-donut-layout"><div className="report-donut" role="img" aria-label={unavailable?'Attendance unavailable':statuses.map((s,i)=>`${s}: ${counts[i]}`).join(', ')} style={{background:unavailable || !attendance.length?'#e8edf5':`conic-gradient(${gradient})`}}><div><strong>{metric(attendance.length)}</strong><span>Records</span></div></div><ul className="report-legend">{statuses.map((s,i)=><li key={s}><i style={{background:colors[i]}}/><span>{s}</span><b>{metric(counts[i])}</b></li>)}</ul></div><p className="chart-note">Recorded attendance only; missing records are not counted as absences.</p></article>
   <article className="report-panel"><h2>Weekly Work Hours</h2><div className="report-bars" role="img" aria-label={unavailable?'Hours unavailable':weekly.map((n,i)=>`Week ${i+1}: ${number(n)} hours`).join(', ')}>{weekly.map((n,i)=><div className="report-bar-column" key={i}><span>{metric(number(n))}</span><div className="report-bar-track"><i style={{height:`${unavailable?0:n/Math.max(1,...weekly)*100}%`}}/></div><small>Week {i+1}</small></div>)}</div><p className="chart-note">Weeks group days 1–7, 8–14, 15–21, 22–28 and 29–31.</p></article>
   <article className="report-panel"><h2>Payroll Status</h2><div className="report-donut-layout"><div className="report-donut" style={{background:unavailable || !payroll.length?'#e8edf5':`conic-gradient(#6366f1 0 ${paid/payroll.length*100}%, #fbbf24 0 100%)`}}><div><strong>{metric(payroll.length)}</strong><span>Payrolls</span></div></div><ul className="report-legend"><li><i style={{background:'#6366f1'}}/><span>Paid</span><b>{metric(paid)}</b></li><li><i style={{background:'#fbbf24'}}/><span>Pending</span><b>{metric(payroll.length-paid)}</b></li></ul></div></article>
   <article className="report-panel"><h2>Salary Summary</h2><div className="report-salary">{[['Gross salary','grossSalary'],['Total deductions','totalDeduction'],['Net payroll','netSalary']].map(([label,key])=><div key={key}><span>{label}</span><strong>{metric(`₹${number(payroll.reduce((sum,r)=>sum+Number(r[key] || 0),0))}`)}</strong></div>)}</div><p className="chart-note">Totals reflect generated payroll for this month.</p></article>
  </section>
  <section className="report-panel"><h2>Detailed Reports</h2><div className="report-table-wrap" tabIndex="0" role="region" aria-label="Available reports"><table className="report-table"><thead><tr><th>Report Name</th><th>Period</th><th>Records</th><th>Action</th></tr></thead><tbody>{Object.entries(reports).map(([key,report])=><tr key={key}><td><span className="report-file-icon">▤</span>{report.title}</td><td>{key==='employees'?'Current':month}</td><td>{metric(data[key].filter(match).length)}</td><td><div className="report-row-actions"><button disabled={unavailable} aria-label={`View ${report.title}`} onClick={()=>{setView(key);setSearch('');setPage(1);}}>View</button><button disabled={unavailable || !data[key].filter(match).length} aria-label={`Download ${report.title}`} onClick={()=>download(key)}>↓ CSV</button></div></td></tr>)}</tbody></table></div></section>
  {view&&<section className="report-panel report-detail"><div className="reports-header"><h2>{reports[view].title}</h2><button className="report-button light" onClick={()=>setView(null)}>Close</button></div><label>Search report<input type="search" placeholder="Search records…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><p className="chart-note">{filtered.length} matching records</p>{!filtered.length?<p className="report-message">No matching records. Try another month or clear the filters.</p>:<><div className="report-table-wrap" tabIndex="0" role="region" aria-label="Report records"><table className="report-table"><thead><tr>{reports[view].columns.map(k=><th key={k}>{labels[k]}</th>)}</tr></thead><tbody>{filtered.slice((currentPage-1)*pageSize,currentPage*pageSize).map((r,i)=><tr key={r._id || i}>{reports[view].columns.map(k=><td key={k}>{r[k]??'—'}</td>)}</tr>)}</tbody></table></div><div className="reports-actions report-pagination"><span>Page {currentPage} of {pages}</span><button className="report-button light" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button><button className="report-button light" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Next</button></div></>}</section>}
 </div></div>;
}

