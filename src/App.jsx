import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  UserCircle,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  Plus,
  Upload,
  AlertCircle,
  Activity,
  BarChart2,
  WifiOff,
  CloudOff,
  CalendarOff,
  Copy,
  Cloud
} from "lucide-react";

// ─── FIREBASE INITIALIZATION ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCxDK32bbq-Y8iYyoq1s-0vqNXpn02eepk",
  authDomain: "new-edu-track.firebaseapp.com",
  projectId: "new-edu-track",
  storageBucket: "new-edu-track.firebasestorage.app",
  messagingSenderId: "106894032065",
  appId: "1:106894032065:web:4d53d7f33ca1280ea96840",
  measurementId: "G-5J63MEB0GJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "edutrack-production";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CLASSES = [
  { id: "nursery", label: "Nursery" },
  { id: "kg",      label: "KG"      },
  ...Array.from({ length: 12 }, (_, i) => ({ id: `${i + 1}`, label: `Class ${i + 1}` })),
];
const SECTIONS = ["A", "B"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Helper: Format Date
const fmtDate = (d) => d.toISOString().split('T')[0];

const isWeekend = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
};

const getPastValidDates = (days) => {
  const dates = [];
  let d = new Date();
  while(dates.length < days) {
    const ds = fmtDate(d);
    if(!isWeekend(ds)) dates.push(ds);
    d.setDate(d.getDate() - 1);
  }
  return dates.reverse();
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, color, icon: Icon }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-card-inner">
        <div>
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
          <div className="stat-sub">{sub}</div>
        </div>
        <div className="stat-icon-wrap">
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

function Dashboard({ students, attendance, user, onSeed }) {
  const today = fmtDate(new Date());
  const myClassId = user.role === "teacher" ? user.assignedClass : "all";
  const mySecId = user.role === "teacher" ? user.assignedSection : "all";

  const stats = useMemo(() => {
    const classes = myClassId === "all" ? CLASSES : CLASSES.filter(c => c.id === myClassId);
    const sections = mySecId === "all" ? SECTIONS : [mySecId];
    let present = 0, total = 0;
    classes.forEach(cls => sections.forEach(sec => {
      const list = students[`${cls.id}_${sec}`] || [];
      total += list.length;
      const rec = attendance[`${today}_${cls.id}_${sec}`];
      if (rec) present += rec.present.length;
    }));
    return { total, present, absent: total - present, pct: total > 0 ? Math.round((present/total)*100) : 0 };
  }, [students, attendance, today, myClassId, mySecId]);

  const past30Days = useMemo(() => getPastValidDates(30), []);

  const trendData = useMemo(() => {
    const classes = myClassId === "all" ? CLASSES : CLASSES.filter(c => c.id === myClassId);
    const sections = mySecId === "all" ? SECTIONS : [mySecId];
    return past30Days.map(date => {
      let present = 0, total = 0;
      classes.forEach(cls => sections.forEach(sec => {
        const list = students[`${cls.id}_${sec}`] || [];
        total += list.length;
        const rec = attendance[`${date}_${cls.id}_${sec}`];
        if (rec) present += rec.present.length;
      }));
      return { date: date.slice(5), pct: total > 0 ? Math.round((present/total)*100) : 0 };
    });
  }, [students, attendance, past30Days, myClassId, mySecId]);

  const classCompData = useMemo(() => {
    const data = [];
    CLASSES.forEach(c => SECTIONS.forEach(s => {
      if (myClassId !== 'all' && (c.id !== myClassId || s !== mySecId)) return;
      const list = students[`${c.id}_${s}`] || [];
      const rec = attendance[`${today}_${c.id}_${s}`];
      const total = list.length;
      const present = rec ? rec.present.length : 0;
      if (total > 0) data.push({ name: `${c.label} ${s}`, rate: Math.round((present/total)*100) });
    }));
    return data.sort((a,b) => b.rate - a.rate);
  }, [students, attendance, today, myClassId, mySecId]);

  const insightText = classCompData.length > 1
    ? `Highest: ${classCompData[0].name} has ${classCompData[0].rate}% vs Lowest: ${classCompData[classCompData.length-1].name} at ${classCompData[classCompData.length-1].rate}%.`
    : classCompData.length === 1
      ? `Your class is currently at ${classCompData[0].rate}% attendance today.`
      : "Not enough data recorded today for performance metrics.";

  const riskStudents = useMemo(() => {
    const studentStats = {};
    const classes = myClassId === "all" ? CLASSES : CLASSES.filter(c => c.id === myClassId);
    const sections = mySecId === "all" ? SECTIONS : [mySecId];
    classes.forEach(c => sections.forEach(s => {
      const list = students[`${c.id}_${s}`] || [];
      list.forEach(stu => {
        studentStats[stu.id] = { name: stu.name, cls: `${c.label} ${s}`, absentCount: 0, totalDays: 0 };
      });
      past30Days.forEach(date => {
        const rec = attendance[`${date}_${c.id}_${s}`];
        if (rec) {
          list.forEach(stu => {
            studentStats[stu.id].totalDays++;
            if (!rec.present.includes(stu.id)) studentStats[stu.id].absentCount++;
          });
        }
      });
    }));
    return Object.values(studentStats)
      .filter(st => st.totalDays > 0)
      .map(st => ({ ...st, absentRate: Math.round((st.absentCount/st.totalDays)*100) }))
      .filter(st => st.absentRate > 25)
      .sort((a,b) => b.absentRate - a.absentRate)
      .slice(0, 5);
  }, [students, attendance, past30Days, myClassId, mySecId]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Decision Dashboard</h1>
          <p className="page-sub">Hello, {user.username}. Analytics for {new Date().toLocaleDateString()}.</p>
        </div>
        {Object.keys(students).length === 0 && user.role === "admin" && (
          <button onClick={onSeed} className="btn-seed">Seed Demo Data</button>
        )}
      </div>

      <div className="grid-4">
        <StatCard title="Total Students" value={stats.total} sub="Registered" color="#58a6ff" icon={Users} />
        <StatCard title="Present Today" value={stats.present} sub={`${stats.pct}% Attendance`} color="#3fb950" icon={CheckSquare} />
        <StatCard title="Absent Today" value={stats.absent} sub="Requires attention" color="#f85149" icon={AlertTriangle} />
        <StatCard title="School Health" value={stats.pct > 80 ? "Active" : "Low"} sub="Real-time Status" color="#d29922" icon={LayoutDashboard} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <Activity className="text-yellow" size={20} />
            <h3 className="card-title">30-Day Attendance Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize:10,fill:'#8b949e'}} minTickGap={15} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:'#8b949e'}} domain={['auto',100]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{backgroundColor:'#22272e',border:'1px solid #30363d',borderRadius:'8px',color:'#adbac7'}} />
              <Area type="monotone" dataKey="pct" name="Attendance %" stroke="#58a6ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPct)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header card-header-between">
            <div className="flex-row-gap">
              <BarChart2 className="text-blue" size={20} />
              <h3 className="card-title">Class Performance Comparison</h3>
            </div>
            {user.role === 'admin' && <span className="badge-admin">ADMIN</span>}
          </div>
          <p className="insight-box">
            <span className="insight-emoji">💡</span>
            <span><strong>Insight:</strong> {insightText}</span>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={classCompData.slice(0,10)} margin={{top:10,right:0,left:-20,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:10,fill:'#8b949e'}} interval={0} angle={-20} textAnchor="end" height={40} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'#8b949e'}} domain={[0,100]} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill:'#22272e'}} contentStyle={{backgroundColor:'#22272e',border:'1px solid #30363d',borderRadius:'8px',color:'#adbac7'}} />
              <Bar dataKey="rate" name="Attendance %" radius={[4,4,0,0]}>
                {classCompData.map((entry,index) => (
                  <Cell key={`cell-${index}`} fill={entry.rate>=90?'#3fb950':entry.rate>=75?'#d29922':'#f85149'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-Risk Students */}
      {riskStudents.length > 0 && (
        <div className="card">
          <div className="card-header">
            <AlertTriangle className="text-red" size={20} />
            <h3 className="card-title">At-Risk Students (Absent &gt;25% in last 30 days)</h3>
          </div>
          <div className="risk-list">
            {riskStudents.map((st, i) => (
              <div key={i} className="risk-item">
                <div className="risk-avatar">{st.name.charAt(0)}</div>
                <div className="risk-info">
                  <div className="risk-name">{st.name}</div>
                  <div className="risk-class">{st.cls}</div>
                </div>
                <div className="risk-rate" style={{color: st.absentRate > 50 ? '#f85149' : '#d29922'}}>
                  {st.absentRate}% absent
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MARK ATTENDANCE ─────────────────────────────────────────────────────────

function MarkAttendance({ students, attendance, onSaveAtt, user, holidays }) {
  const isTeacher = user.role === "teacher";
  const isGuest = user.role === "guest";
  const [cls, setCls] = useState(isTeacher ? user.assignedClass : "nursery");
  const [sec, setSec] = useState(isTeacher ? user.assignedSection : "A");
  const [date, setDate] = useState(fmtDate(new Date()));
  const [marked, setMarked] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const key = `${date}_${cls}_${sec}`;
  const list = students[`${cls}_${sec}`] || [];
  const isHoliday = holidays && holidays[date];

  useEffect(() => {
    const rec = attendance[key];
    if (rec) {
      const m = {}; rec.present.forEach(id => m[id] = true);
      setMarked(m);
    } else {
      const m = {}; list.forEach(s => m[s.id] = true);
      setMarked(m);
    }
  }, [key]);

  const handleSave = async () => {
    if (isHoliday) return;
    setSaving(true);
    const present = list.filter(s => marked[s.id]).map(s => s.id);
    await onSaveAtt(key, { date, classId: cls, section: sec, present });
    setSaving(false);
    setMsg("Saved Successfully!");
    setTimeout(() => setMsg(""), 3000);
  };

  const handleSmartDefault = () => {
    const pastDates = Object.values(attendance)
      .filter(a => a.classId === cls && a.section === sec && a.date < date)
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    if (pastDates.length > 0) {
      const lastRecord = pastDates[0];
      const m = {};
      list.forEach(s => m[s.id] = false);
      lastRecord.present.forEach(id => m[id] = true);
      setMarked(m);
      setMsg(`Copied from ${lastRecord.date}`);
      setTimeout(() => setMsg(""), 3000);
    } else {
      setMsg("No previous records found.");
      setTimeout(() => setMsg(""), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Take Attendance</h1>
          <p className="page-sub">Update logs for {date}</p>
        </div>
        <div className="header-actions">
          {msg && <span className="msg-success">{msg}</span>}
          {!isGuest && (
            <>
              <button onClick={handleSmartDefault} disabled={isHoliday} className="btn-secondary">
                <Copy size={16} /> Auto-Fill
              </button>
              <button onClick={handleSave} disabled={isHoliday} className="btn-primary">
                {saving ? "Syncing..." : <><CheckSquare size={18} /> Save</>}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card filter-bar">
        <div>
          <label className="field-label">Class</label>
          <select className="select" value={cls} onChange={e=>setCls(e.target.value)} disabled={isTeacher}>
            {CLASSES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Section</label>
          <select className="select" value={sec} onChange={e=>setSec(e.target.value)} disabled={isTeacher}>
            {SECTIONS.map(s=><option key={s} value={s}>Sec {s}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Date</label>
          <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} />
        </div>
      </div>

      {isHoliday ? (
        <div className="holiday-banner">
          <CalendarOff className="holiday-icon" size={48} />
          <h2 className="holiday-title">School Holiday</h2>
          <p className="holiday-name">{isHoliday.name}</p>
          <p className="holiday-sub">Attendance marking is locked for this date.</p>
        </div>
      ) : (
        <div className="student-grid">
          {list.map(s => (
            <div
              key={s.id}
              onClick={() => !isGuest && setMarked(p => ({...p, [s.id]: !p[s.id]}))}
              className={`student-card ${marked[s.id] ? 'present' : 'absent'}`}
            >
              <div className={`student-avatar ${marked[s.id] ? 'present' : 'absent'}`}>
                {marked[s.id] ? "✓" : "✕"}
              </div>
              <div className="student-info">
                <div className="student-name">{s.name}</div>
                <div className="student-roll">Roll: {s.rollNo}</div>
              </div>
              <div className={`student-badge ${marked[s.id] ? 'present' : 'absent'}`}>
                {marked[s.id] ? 'Present' : 'Absent'}
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="empty-state">No students found.</div>}
        </div>
      )}
    </div>
  );
}

// ─── STUDENT ADMIN ───────────────────────────────────────────────────────────

function StudentAdmin({ students, onSaveStuds, user }) {
  const [cls, setCls] = useState("nursery");
  const [sec, setSec] = useState("A");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRoll, setEditRoll] = useState("");

  const key = `${cls}_${sec}`;
  const current = students[key] || [];

  const add = () => {
    if (!newName) return;
    onSaveStuds(key, [...current, { id: 's_'+Date.now(), name: newName, rollNo: current.length + 1 }]);
    setNewName("");
  };

  const saveEdit = () => {
    const updated = current.map(s => s.id === editingId ? { ...s, name: editName, rollNo: parseInt(editRoll) || s.rollNo } : s);
    onSaveStuds(key, updated);
    setEditingId(null);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = evt.target.result.split("\n").map(r => r.trim()).filter(Boolean);
      if (rows.length < 2) return;
      let maxRoll = current.length > 0 ? Math.max(...current.map(s => s.rollNo)) : 0;
      const newStuds = [...current];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(",").map(c => c.replace(/^"|"$/g, '').trim());
        if (cols[0]) newStuds.push({ id: `s_${Date.now()}_${i}`, name: cols[0], rollNo: ++maxRoll });
      }
      onSaveStuds(key, newStuds);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Student Records</h1>

      <div className="card filter-bar flex-wrap">
        <div className="flex-row-gap">
          <select className="select" value={cls} onChange={e=>setCls(e.target.value)}>
            {CLASSES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="select" value={sec} onChange={e=>setSec(e.target.value)}>
            {SECTIONS.map(s=><option key={s} value={s}>Sec {s}</option>)}
          </select>
        </div>
        {user?.role !== "guest" && (
          <div className="flex-row-gap flex-1">
            <input className="input flex-1" placeholder="Full Name..." value={newName} onChange={e=>setNewName(e.target.value)} />
            <button onClick={add} className="btn-primary"><Plus size={16}/> Add</button>
            <label className="btn-green cursor-pointer">
              <Upload size={16}/> CSV Import
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Student Name</th>
              {user?.role !== "guest" && <th className="text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {current.map(s => (
              <tr key={s.id}>
                <td className="w-32">
                  {editingId === s.id
                    ? <input className="input input-sm" type="number" value={editRoll} onChange={e=>setEditRoll(e.target.value)} />
                    : <span className="mono text-muted">{s.rollNo}</span>}
                </td>
                <td className="font-semibold">
                  {editingId === s.id
                    ? <input className="input input-sm" value={editName} onChange={e=>setEditName(e.target.value)} />
                    : s.name}
                </td>
                {user?.role !== "guest" && (
                  <td className="text-right">
                    {editingId === s.id ? (
                      <div className="flex-row-gap justify-end">
                        <button onClick={saveEdit} className="btn-text text-green">SAVE</button>
                        <button onClick={()=>setEditingId(null)} className="btn-text text-muted">CANCEL</button>
                      </div>
                    ) : (
                      <div className="flex-row-gap justify-end">
                        <button onClick={()=>{setEditingId(s.id);setEditName(s.name);setEditRoll(s.rollNo);}} className="icon-btn text-blue"><Edit2 size={16}/></button>
                        <button onClick={()=>onSaveStuds(key, current.filter(x=>x.id!==s.id))} className="icon-btn text-red"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {current.length === 0 && (
              <tr><td colSpan={3} className="empty-state">No students recorded in this section.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── HOLIDAY CALENDAR ────────────────────────────────────────────────────────

function HolidayAdmin({ holidays, onSaveHoliday, onDeleteHoliday, user }) {
  const [date, setDate] = useState(fmtDate(new Date()));
  const [name, setName] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!date || !name) return;
    onSaveHoliday(date, { date, name });
    setName("");
  };

  const holidayList = Object.values(holidays || {}).sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6">
      <h1 className="page-title">Academic Calendar</h1>

      {user?.role !== "guest" && (
        <form onSubmit={handleAdd} className="card">
          <h2 className="section-heading">Register Holiday</h2>
          <div className="filter-bar">
            <div>
              <label className="field-label">Date</label>
              <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} required />
            </div>
            <div className="flex-1">
              <label className="field-label">Holiday Name</label>
              <input placeholder="e.g. Summer Break, Diwali..." className="input w-full" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary self-end">Add Holiday</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Holiday Name</th>
              {user?.role !== "guest" && <th className="text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {holidayList.map(h => (
              <tr key={h.date}>
                <td className="mono text-muted">{h.date}</td>
                <td className="font-semibold">{h.name}</td>
                {user?.role !== "guest" && (
                  <td className="text-right">
                    <button onClick={()=>onDeleteHoliday(h.date)} className="icon-btn text-red"><Trash2 size={16}/></button>
                  </td>
                )}
              </tr>
            ))}
            {holidayList.length === 0 && <tr><td colSpan={3} className="empty-state">No holidays registered.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ACCOUNTS PAGE ───────────────────────────────────────────────────────────

function AccountsPage({ accounts, onSaveAccount, onDeleteAccount, user }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [cls, setCls] = useState("nursery");
  const [sec, setSec] = useState("A");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    onSaveAccount({ id: `u_${Date.now()}`, username, password, role, assignedClass: cls, assignedSection: sec });
    setUsername(""); setPassword("");
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Staff Accounts</h1>

      {user?.role !== "guest" && (
        <form onSubmit={handleAdd} className="card">
          <h2 className="section-heading">Create New Account</h2>
          <div className="grid-5">
            <div><label className="field-label">Username</label><input className="input w-full" value={username} onChange={e=>setUsername(e.target.value)} required /></div>
            <div><label className="field-label">Password</label><input type="password" className="input w-full" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
            <div>
              <label className="field-label">Role</label>
              <select className="select w-full" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            {role === "teacher" ? (
              <>
                <div><label className="field-label">Class</label><select className="select w-full" value={cls} onChange={e=>setCls(e.target.value)}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div><label className="field-label">Section</label><select className="select w-full" value={sec} onChange={e=>setSec(e.target.value)}>{SECTIONS.map(s=><option key={s} value={s}>Sec {s}</option>)}</select></div>
              </>
            ) : <div className="col-span-2"></div>}
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" className="btn-primary">Create Account</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th><th>Role</th><th>Assignment</th><th>Password</th>{user?.role !== "guest" && <th className="text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id}>
                <td className="font-semibold">{a.username}</td>
                <td><span className={`role-badge ${a.role}`}>{a.role}</span></td>
                <td className="text-muted">{a.role === 'teacher' ? `${CLASSES.find(c=>c.id===a.assignedClass)?.label} (Sec ${a.assignedSection})` : 'Full Access'}</td>
                <td className="mono text-muted">{a.password}</td>
                {user?.role !== "guest" && (
                  <td className="text-right">
                    {a.username !== 'admin' && (
                      <button onClick={()=>onDeleteAccount(a.id)} className="icon-btn text-red"><Trash2 size={16}/></button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {accounts.length === 0 && <tr><td colSpan={5} className="empty-state">No accounts found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, accounts }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const handle = (e) => {
    e.preventDefault();
    if (u.toLowerCase() === "guest" && p.toLowerCase() === "guest") { onLogin({ id: "guest", username: "Guest", role: "guest" }); return; }
    if (u === "admin" && p === "admin") { onLogin({ id: "admin", username: "Admin", role: "admin" }); return; }
    const match = accounts.find(a => a.username.toLowerCase() === u.toLowerCase() && a.password === p);
    if (match) onLogin(match);
    else setErr("Access Denied. Try admin / admin.");
  };

  return (
    <div className="login-screen">
      <form onSubmit={handle} className="login-card">
        <div className="login-header">
          <div className="login-icon"><ShieldCheck size={32} /></div>
          <h1 className="login-title">EduTrack Pro</h1>
          <p className="login-sub">Institution Login</p>
        </div>
        {err && <div className="error-banner">{err}</div>}
        <div className="space-y-4">
          <div><label className="field-label">Username</label><input className="input w-full" value={u} onChange={e=>setU(e.target.value)} /></div>
          <div><label className="field-label">Password</label><input className="input w-full" type="password" value={p} onChange={e=>setP(e.target.value)} /></div>
          <button type="submit" className="btn-primary w-full mt-4">Authenticate</button>
        </div>
      </form>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState({});
  const [attendance, setAttendance] = useState({});
  const [holidays, setHolidays] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const processQueue = async () => {
      const queue = JSON.parse(localStorage.getItem('attQueue') || '[]');
      if (!queue.length) return;
      try {
        for (const item of queue) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', item.key), item.data);
        }
        localStorage.removeItem('attQueue');
        setPendingSync(0);
      } catch(e) { console.error("Queue Sync Failed:", e); }
    };
    const handleOnline = () => { setIsOnline(true); processQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setPendingSync(JSON.parse(localStorage.getItem('attQueue') || '[]').length);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); }
      catch(e) { 
        console.error("Firebase Auth Fail:", e);
        setErrorMsg("Firebase Auth Failed: Please enable Anonymous Authentication in Firebase console.");
        setLoading(false);
      }
      finally { setAuthReady(true); }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, u => {
      setFbUser(u);
      if (authReady && !u) setLoading(false);
    });
    return () => unsub();
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !fbUser) return;
    const base = ['artifacts', appId, 'public', 'data'];
    const unsubStuds = onSnapshot(collection(db, ...base, 'students'), s => {
      const d = {}; s.forEach(x => d[x.id] = x.data().list); setStudents(d); setLoading(false);
    }, e => { console.error(e); setErrorMsg("Firestore Error: Missing permissions or setup."); setLoading(false); });
    const unsubAtt = onSnapshot(collection(db, ...base, 'attendance'), s => {
      const d = {}; s.forEach(x => d[x.id] = x.data()); setAttendance(d);
    }, e => console.error(e));
    const unsubHol = onSnapshot(collection(db, ...base, 'holidays'), s => {
      const d = {}; s.forEach(x => d[x.id] = x.data()); setHolidays(d);
    }, e => console.error(e));
    const unsubUsr = onSnapshot(collection(db, ...base, 'appUsers'), s => {
      const d = []; s.forEach(x => d.push(x.data())); setAccounts(d);
    }, e => console.error(e));
    return () => { unsubStuds(); unsubAtt(); unsubHol(); unsubUsr(); };
  }, [authReady, fbUser]);

  const saveAtt = async (k, v) => {
    if (!isOnline) {
      const q = JSON.parse(localStorage.getItem('attQueue') || '[]');
      q.push({ key: k, data: v });
      localStorage.setItem('attQueue', JSON.stringify(q));
      setPendingSync(q.length);
      setAttendance(prev => ({...prev, [k]: v}));
      return;
    }
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', k), v);
  };
  const saveStuds = (k, v) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', k), { list: v });
  const saveHoliday = (k, v) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'holidays', k), v);
  const deleteHoliday = (k) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'holidays', k));
  const saveAcc = (d) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appUsers', d.id), d);
  const delAcc = (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appUsers', id));

  const seed = async () => {
    const mkRand = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const FNAME = ["Aarav","Aditi","Aditya","Akash","Amit","Ananya"];
    const LNAME = ["Sharma","Verma","Gupta","Singh","Patel","Tiwari"];
    setLoading(true);
    let uid = 1;
    for (const cls of CLASSES) {
      for (const sec of SECTIONS) {
        const key = `${cls.id}_${sec}`;
        const r = mkRand(cls.id.charCodeAt(0) * 200 + (sec==="A"?1:2) * 30 + 7);
        const n = 22 + Math.floor(r() * 8);
        const arr = [];
        for (let i = 0; i < n; i++) {
          const name = `${FNAME[Math.floor(r()*FNAME.length)]} ${LNAME[Math.floor(r()*LNAME.length)]}`;
          arr.push({ id: `s${uid++}`, name, rollNo: i + 1 });
        }
        await saveStuds(key, arr);
      }
    }
    const past30 = getPastValidDates(30);
    for (const date of past30) {
      for (const cls of CLASSES) {
        for (const sec of SECTIONS) {
          const key = `${date}_${cls.id}_${sec}`;
          const list = students[`${cls.id}_${sec}`] || [];
          if (list.length > 0) {
            const r = mkRand(date.charCodeAt(date.length-1) * 100 + cls.id.charCodeAt(0) + (sec==="A"?1:2));
            const present = list.filter(() => r() > 0.15).map(s => s.id);
            await saveAtt(key, { date, classId: cls.id, section: sec, present });
          }
        }
      }
    }
    setLoading(false);
  };

  if (errorMsg) return (
    <div className="login-screen">
      <div className="login-card" style={{ textAlign: "center", margin: "0 auto" }}>
        <div className="login-icon" style={{ margin: "0 auto 1rem" }}><AlertCircle size={32} className="text-red" /></div>
        <h1 className="login-title">Connection Error</h1>
        <div className="error-banner mt-4">{errorMsg}</div>
        <p className="text-muted mt-4" style={{ fontSize: "0.875rem" }}>Please check your Firebase configuration and ensure Anonymous Authentication is enabled.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
    </div>
  );

  if (!appUser) return <LoginScreen onLogin={setAppUser} accounts={accounts} />;

  const menu = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","teacher","guest"] },
    { id: "mark", label: "Take Attendance", icon: CheckSquare, roles: ["admin","teacher","guest"] },
    { id: "records", label: "Student Admin", icon: Users, roles: ["admin","guest"] },
    { id: "calendar", label: "Calendar", icon: Calendar, roles: ["admin","guest"] },
    { id: "accounts", label: "Staff Accounts", icon: UserCircle, roles: ["admin","guest"] },
  ].filter(m => m.roles.includes(appUser.role));

  return (
    <div className="app-layout">
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="flex-row-gap"><ShieldCheck size={28} /> EduTrack Pro</div>
        </div>

        <div className="sidebar-status">
          {!isOnline ? (
            <div className="status-badge offline"><WifiOff size={14} /> Offline {pendingSync > 0 && `(${pendingSync} pending)`}</div>
          ) : pendingSync > 0 ? (
            <div className="status-badge syncing"><Cloud size={14} className="animate-pulse" /> Syncing...</div>
          ) : (
            <div className="status-badge online"><Cloud size={14} /> Cloud Active</div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menu.map(m => (
            <button key={m.id} onClick={()=>{setPage(m.id);setSidebarOpen(false);}} className={`nav-btn ${page===m.id?'active':''}`}>
              <m.icon size={20} /> {m.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{appUser.username.charAt(0).toUpperCase()}</div>
            <div className="overflow-hidden">
              <div className="user-name">{appUser.username}</div>
              <div className="user-role">{appUser.role}</div>
            </div>
          </div>
          <button onClick={()=>setAppUser(null)} className="signout-btn"><LogOut size={14} /> Sign Out</button>
        </div>
      </aside>

      {/* Main Body */}
      <div className="main-body">
        <header className="mobile-header">
          <span className="mobile-brand"><ShieldCheck size={20} /> EduTrack</span>
          <button onClick={()=>setSidebarOpen(true)} className="icon-btn"><Menu size={28}/></button>
        </header>

        <main className="main-content">
          {page === "dashboard" && <Dashboard students={students} attendance={attendance} user={appUser} onSeed={seed} />}
          {page === "mark" && <MarkAttendance students={students} attendance={attendance} onSaveAtt={saveAtt} user={appUser} holidays={holidays} />}
          {page === "records" && <StudentAdmin students={students} onSaveStuds={saveStuds} user={appUser} />}
          {page === "calendar" && <HolidayAdmin holidays={holidays} onSaveHoliday={saveHoliday} onDeleteHoliday={deleteHoliday} user={appUser} />}
          {page === "accounts" && <AccountsPage accounts={accounts} onSaveAccount={saveAcc} onDeleteAccount={delAcc} user={appUser} />}
        </main>
      </div>
    </div>
  );
}
