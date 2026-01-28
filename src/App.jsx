import { FinanceProvider } from './context/FinanceContext';
import BalanceDashboard from './components/BalanceDashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';

function App() {
  return (
    <FinanceProvider>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Control de Caja - Centro de Rehabilitación ANDROMEDA S.A.S</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Detalle de ingresos y egresos diarios</p>
        </header>

        <BalanceDashboard />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <TransactionForm />
          <TransactionList />
        </div>
      </div>
    </FinanceProvider>
  );
}

export default App;
