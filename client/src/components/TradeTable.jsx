import { signedMoney, fmtR, tone, pct } from '../lib/format.js';

const Side = ({ side }) => <span className={`pill pill--${side.toLowerCase()}`}>{side}</span>;

export function TradeTable({ trades, onEdit, onDelete, compact = false, empty = 'No trades match these filters' }) {
  const cols = compact ? 5 : 12;
  return (
    <div className="table-wrap">
      <table className={`table${compact ? '' : ' table--full'}`}>
        <thead>
          <tr>
            <th>Date</th><th>Symbol</th><th>Side</th>
            {!compact && <><th>Setup</th><th className="num">Entry</th><th className="num">Stop</th><th className="num">Exit</th><th className="num">Qty</th></>}
            <th className="num">R</th><th className="num">P&amp;L</th>
            {!compact && <><th>Notes</th><th><span className="vh">Actions</span></th></>}
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && <tr><td colSpan={cols} className="empty">{empty}</td></tr>}
          {trades.map(t => (
            <tr key={t.id}>
              <td>{t.date}</td><td>{t.symbol}</td><td><Side side={t.side} /></td>
              {!compact && <><td>{t.setup}</td><td className="num">{t.entry}</td><td className="num">{t.stop}</td><td className="num">{t.exit}</td><td className="num">{t.qty}</td></>}
              <td className={`num ${tone(t.r)}`}>{fmtR(t.r)}</td>
              <td className={`num ${tone(t.pnl)}`}>{signedMoney(t.pnl)}</td>
              {!compact && (
                <>
                  <td className="notes" title={t.notes}>{t.notes}</td>
                  <td className="row-actions">
                    <button className="del" onClick={() => onEdit(t)} aria-label={`Edit ${t.symbol} trade on ${t.date}`}>Edit</button>
                    <button className="del del--danger" onClick={() => onDelete(t)} aria-label={`Delete ${t.symbol} trade on ${t.date}`}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SetupTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Setup</th><th className="num">Trades</th><th className="num">Win rate</th><th className="num">Avg R</th><th className="num">Net</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="empty">No trades in this range</td></tr>}
          {rows.map(s => (
            <tr key={s.setup}>
              <td>{s.setup}</td><td className="num">{s.count}</td><td className="num">{pct(s.winRate)}</td>
              <td className={`num ${tone(s.avgR)}`}>{fmtR(s.avgR)}</td><td className={`num ${tone(s.net)}`}>{signedMoney(s.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
