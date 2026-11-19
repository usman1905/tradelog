# TradeLog

A trading journal that shows which setups actually make money.

**Live demo:** [usman1905.github.io/tradelog](https://usman1905.github.io/tradelog/)

[![Tests](https://github.com/usman1905/tradelog/actions/workflows/ci.yml/badge.svg)](https://github.com/usman1905/tradelog/actions/workflows/ci.yml)

## What it does

- Log a trade with entry, stop loss, exit, quantity, setup and notes
- Calculates risk, profit and loss, and the result in R (multiples of the risk taken)
- Dashboard with net P&L, win rate, average R, profit factor and max drawdown
- Equity curve and R distribution charts drawn on canvas, no chart library
- Performance grouped by setup, so you can drop the strategies that lose
- Search and filter every trade, delete mistakes, export everything to CSV
- Validates input, for example a long trade's stop must sit below entry

Data is stored in the browser with `localStorage`. The demo starts with seeded sample trades; use **Reset sample data** to restore them.

## Tech

Plain HTML, CSS and JavaScript. No framework and no build step.

| Path | Purpose |
| --- | --- |
| `index.html` | Layout, dashboard, trades table and the new-trade dialog |
| `style.css` | Dark trading-terminal theme, responsive down to phones |
| `app.js` | User interface: rendering, events and storage |
| `src/journal.js` | Trade maths: P&L, risk, R-multiple, statistics, drawdown, validation, seeded sample data (no DOM, fully tested) |
| `tests/journal.test.js` | 8 tests for the trade maths and validation |
| `.github/workflows/ci.yml` | Runs the tests on every push |

## Run locally

The app uses ES modules, so serve the folder rather than opening the file directly:

```bash
npm start
```

Then open the address it prints.

## Tests

Needs Node.js 18 or newer. No dependencies to install.

```bash
npm test
```

## Roadmap

- Accounts and cloud sync with a Node.js API and PostgreSQL
- Import trades from exchange CSV exports
- Screenshot attachments per trade

## License

MIT. Built by [Usman](https://usman1905.github.io).
