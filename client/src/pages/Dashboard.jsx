import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router';
import { api } from '../api/index.js';
import { useApi } from '../lib/useApi.js';
import { signedMoney } from '../lib/format.js';
import { Kpis } from '../components/Kpis.jsx';
import { EquityChart, RHistogram } from '../components/charts.jsx';
import { SetupTable, TradeTable } from '../components/TradeTable.jsx';

export function Dashboard() {
  const { from, version, setSetups } = useOutletContext();
  const key = `${from}|${version}`;
  const summary = useApi(() => api.summary({ from }), key);
  const list = useApi(() => api.listTrades({ from, limit: 500 }), key);

  const setupNames = summary.data?.bySetup.map(s => s.setup).join('|');
  useEffect(() => { if (setupNames !== undefined) setSetups(setupNames ? setupNames.split('|') : []); }, [setupNames, setSetups]);

  const error = summary.error || list.error;
  if (error) return <p className="card error-card" role="alert">{error.message}</p>;
  if (!summary.data || !list.data) return <p className="muted loading">Loading your trades…</p>;

  const { stats, bySetup, equity } = summary.data;
  const trades = list.data.trades;
  const last = equity[equity.length - 1]?.equity ?? 0;

  return (
    <section>
      <Kpis stats={stats} />
      <div className="grid2">
        <div className="card">
          <div className="card__head"><h2>Equity curve</h2><span className="muted">{equity.length ? `${signedMoney(last)} over ${equity.length} trades` : ''}</span></div>
          <EquityChart points={equity} />
        </div>
        <div className="card">
          <div className="card__head"><h2>R distribution</h2><span className="muted">Result per trade in R</span></div>
          <RHistogram values={trades.map(t => t.r)} />
        </div>
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card__head"><h2>By setup</h2><span className="muted">Which strategies pay</span></div>
          <SetupTable rows={bySetup} />
        </div>
        <div className="card">
          <div className="card__head"><h2>Recent trades</h2><Link className="link" to="/trades">View all</Link></div>
          <TradeTable compact trades={trades.slice(0, 6)} empty="No trades yet" />
        </div>
      </div>
    </section>
  );
}
