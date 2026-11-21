import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import { App } from '../src/App.jsx';
import { demoApi } from '../src/api/demo.js';

const renderApp = (path = '/') => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider>
  </MemoryRouter>
);

describe('TradeLog app (demo mode)', () => {
  it('shows the dashboard with stats', async () => {
    await demoApi.reset();
    renderApp();
    expect(await screen.findByText('Net P&L')).toBeInTheDocument();
    expect(screen.getByText(/Demo mode/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By setup' })).toBeInTheDocument();
  });

  it('adds a trade through the form and shows it in the list', async () => {
    await demoApi.reset();
    const user = userEvent.setup();
    renderApp('/trades');
    expect(await screen.findByText('46 trades')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ New trade' }));
    const dialog = screen.getByRole('dialog', { hidden: true });
    const field = name => within(dialog).getByLabelText(name);
    await user.type(field('Symbol'), 'tslausd');
    await user.type(field('Setup'), 'Gap fill');
    await user.type(field('Entry'), '100');
    await user.type(field('Stop loss'), '105');
    await user.type(field('Exit'), '110');
    await user.type(field('Quantity'), '1');
    await user.click(within(dialog).getByRole('button', { name: 'Save trade' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/stop goes below entry/);

    await user.clear(field('Stop loss'));
    await user.type(field('Stop loss'), '95');
    expect(within(dialog).getByText(/Result \+\$10/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save trade' }));

    expect(await screen.findByText('47 trades')).toBeInTheDocument();
    expect(screen.getByText('TSLAUSD')).toBeInTheDocument();
  });
});
