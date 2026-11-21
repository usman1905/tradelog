import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { api, isDemo } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fromDate } from '../lib/format.js';
import { TradeDialog } from './TradeDialog.jsx';

const TITLES = {
  '/': ['Dashboard', 'Performance across all logged trades'],
  '/trades': ['Trades', 'Every trade you have logged']
};

export function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();
  const [range, setRange] = useState('all');
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setups, setSetups] = useState([]);

  const refresh = () => setVersion(v => v + 1);
  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = trade => { setEditing(trade); setDialogOpen(true); };

  async function save(trade) {
    if (editing) await api.updateTrade(editing.id, trade);
    else await api.createTrade(trade);
    setDialogOpen(false);
    refresh();
    toast(editing ? 'Trade updated' : 'Trade saved');
  }

  async function exportCsv() {
    try {
      const url = URL.createObjectURL(await api.exportCsv());
      Object.assign(document.createElement('a'), { href: url, download: 'tradelog.csv' }).click();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e.message); }
  }

  async function resetDemo() { await api.reset(); refresh(); toast('Sample data restored'); }

  const [title, sub] = TITLES[pathname] || TITLES['/'];
  const context = { from: fromDate(range), version, refresh, openEdit, setSetups };

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><span className="logo__mark" aria-hidden="true" />TradeLog</div>
        <nav aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `nav-btn${isActive ? ' on' : ''}`}>Dashboard</NavLink>
          <NavLink to="/trades" className={({ isActive }) => `nav-btn${isActive ? ' on' : ''}`}>Trades</NavLink>
        </nav>
        <div className="side__foot">
          {isDemo && <button className="link" onClick={resetDemo}>Reset sample data</button>}
          <button className="link" onClick={exportCsv}>Export CSV</button>
          {!isDemo && user && (
            <div className="who">
              <span>{user.name}</span>
              <button className="link" onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {isDemo && (
          <p className="banner">Demo mode: your trades are saved in this browser only. Run the API to use accounts.</p>
        )}
        <header className="top">
          <div>
            <h1>{title}</h1>
            <p className="muted">{sub}</p>
          </div>
          <div className="top__actions">
            <select value={range} onChange={e => setRange(e.target.value)} aria-label="Date range">
              <option value="all">All time</option>
              <option value="90">Last 90 days</option>
              <option value="30">Last 30 days</option>
            </select>
            <button className="btn btn--primary" onClick={openNew}>+ New trade</button>
          </div>
        </header>
        <Outlet context={context} />
      </main>

      <TradeDialog open={dialogOpen} trade={editing} setups={setups} onClose={() => setDialogOpen(false)} onSave={save} />
    </div>
  );
}
