import { money, signedMoney, fmtR, tone, pct } from '../lib/format.js';

export function Kpis({ stats }) {
  const pf = stats.profitFactor === null || stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2);
  const items = [
    ['Net P&L', signedMoney(stats.net), tone(stats.net), `${stats.count} trades`],
    ['Win rate', pct(stats.winRate), '', `${Math.round(stats.winRate * stats.count)} winners`],
    ['Average R', fmtR(stats.avgR), tone(stats.avgR), 'per trade'],
    ['Profit factor', pf, '', 'gross win ÷ gross loss'],
    ['Max drawdown', money(stats.maxDrawdown), 'down', 'peak to trough']
  ];
  return (
    <div className="kpis">
      {items.map(([label, value, cls, note]) => (
        <div className="kpi" key={label}>
          <span>{label}</span>
          <b className={cls}>{value}</b>
          <small>{note}</small>
        </div>
      ))}
    </div>
  );
}
