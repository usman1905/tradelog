import { useEffect, useRef, useState } from 'react';
import { pnl, risk, rMultiple, validateTrade } from '@tradelog/shared';
import { money, signedMoney, fmtR, today } from '../lib/format.js';

const EMPTY = { date: '', symbol: '', side: 'Long', setup: '', entry: '', stop: '', exit: '', qty: '', notes: '' };
const NUMBERS = ['entry', 'stop', 'exit', 'qty'];

const toTrade = f => ({
  ...f,
  symbol: f.symbol.trim().toUpperCase(),
  setup: f.setup.trim(),
  ...Object.fromEntries(NUMBERS.map(k => [k, parseFloat(f[k])]))
});

/** Add or edit a trade. `trade` is null for a new one. */
export function TradeDialog({ open, trade, setups, onClose, onSave }) {
  const ref = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);

  // Reset the form each time the dialog opens.
  const [openedFor, setOpenedFor] = useState(null);
  const marker = open ? (trade?.id ?? 'new') : null;
  if (marker !== openedFor) {
    setOpenedFor(marker);
    if (open) {
      setForm(trade ? { ...EMPTY, ...Object.fromEntries(Object.entries(trade).map(([k, v]) => [k, v ?? ''])) } : { ...EMPTY, date: today() });
      setError('');
    }
  }

  const t = toTrade(form);
  const problem = validateTrade(t);
  const preview = problem || !t.symbol
    ? 'Fill in entry, stop, exit and quantity to see the result.'
    : `Risk ${money(risk(t))} · Result ${signedMoney(pnl(t))} · ${fmtR(rMultiple(t))}`;

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const message = problem || (!t.symbol && 'Enter a symbol.') || (!t.setup && 'Enter a setup.');
    if (message) { setError(message); return; }
    setSaving(true);
    try {
      const { date, symbol, side, setup, entry, stop, exit, qty, notes } = t;
      await onSave({ date, symbol, side, setup, entry, stop, exit, qty, notes });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-labelledby="trade-dialog-title">
      <form onSubmit={submit} noValidate>
        <h2 id="trade-dialog-title">{trade ? 'Edit trade' : 'New trade'}</h2>
        <div className="form-grid">
          <label>Date<input name="date" type="date" value={form.date} onChange={set('date')} required /></label>
          <label>Symbol<input name="symbol" value={form.symbol} onChange={set('symbol')} placeholder="BTCUSDT" required /></label>
          <label>Side<select name="side" value={form.side} onChange={set('side')}><option>Long</option><option>Short</option></select></label>
          <label>Setup<input name="setup" value={form.setup} onChange={set('setup')} list="setup-options" placeholder="Breakout" required /></label>
          <label>Entry<input name="entry" type="number" step="any" value={form.entry} onChange={set('entry')} required /></label>
          <label>Stop loss<input name="stop" type="number" step="any" value={form.stop} onChange={set('stop')} required /></label>
          <label>Exit<input name="exit" type="number" step="any" value={form.exit} onChange={set('exit')} required /></label>
          <label>Quantity<input name="qty" type="number" step="any" value={form.qty} onChange={set('qty')} required /></label>
          <label className="full">Notes<textarea name="notes" rows="2" value={form.notes} onChange={set('notes')} placeholder="Why did you take it? What did you learn?" /></label>
        </div>
        <datalist id="setup-options">{setups.map(s => <option key={s} value={s} />)}</datalist>
        <p className="preview">{preview}</p>
        <p className="error" role="alert">{error}</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : trade ? 'Save changes' : 'Save trade'}</button>
        </div>
      </form>
    </dialog>
  );
}
