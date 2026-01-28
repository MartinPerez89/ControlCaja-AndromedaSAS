import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function BalanceDashboard() {
  const { getBalance, filter, setFilter, selectedDate, setSelectedDate } = useFinance();
  
  // Local state removed, using global context state
  // const [filter, setFilter] = useState('monthly'); 

  const balance = getBalance();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Balance</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="date" 
            className="form-input" 
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select 
            className="form-select" 
            style={{ width: 'auto' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="all">Total Histórico</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
          <p className="form-label">Ingresos</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-income)' }}>
            {formatCurrency(balance.income)}
          </p>
        </div>
        
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
          <p className="form-label">Egresos</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-expense)' }}>
            {formatCurrency(balance.expense)}
          </p>
        </div>

        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}>
          <p className="form-label">Total</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: balance.total >= 0 ? 'var(--text-primary)' : 'var(--color-expense)' }}>
            {formatCurrency(balance.total)}
          </p>
        </div>
      </div>
    </div>
  );
}
