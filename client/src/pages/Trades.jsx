import { useDeferredValue, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from '../api/index.js';
import { useApi } from '../lib/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { TradeTable } from '../components/TradeTable.jsx';

export function Trades() {
  const { from, version, refresh, openEdit } = useOutletContext();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [side, setSide] = useState('');
  const [result, setResult] = useState('');
  const query = useDeferredValue(q);

  const list = useApi(() => api.listTrades({ from, q: query, side, result }), `${from}|${query}|${side}|${result}|${version}`);

  async function remove(trade) {
    try {
      await api.deleteTrade(trade.id);
      refresh();
      toast(`Deleted ${trade.symbol} trade`);
    } catch (e) { toast(e.message); }
  }

  return (
    <section>
      <div className="filters">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search symbol, setup or notes" aria-label="Search trades" />
        <select value={side} onChange={e => setSide(e.target.value)} aria-label="Side">
          <option value="">All sides</option><option>Long</option><option>Short</option>
        </select>
        <select value={result} onChange={e => setResult(e.target.value)} aria-label="Result">
          <option value="">All results</option><option value="win">Winners</option><option value="loss">Losers</option>
        </select>
      </div>
      {list.error && <p className="card error-card" role="alert">{list.error.message}</p>}
      <div className="card card--flush">
        {list.data
          ? <TradeTable trades={list.data.trades} onEdit={openEdit} onDelete={remove} />
          : !list.error && <p className="muted loading">Loading…</p>}
      </div>
      {list.data && <p className="muted count">{list.data.total} trade{list.data.total === 1 ? '' : 's'}</p>}
    </section>
  );
}
