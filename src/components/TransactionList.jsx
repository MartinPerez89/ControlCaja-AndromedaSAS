import { useFinance } from '../context/FinanceContext';

const CATEGORY_LABELS = {
  // Ingresos
  copago:         'Copago',
  particular:     'Pago Particular',
  obra_social:    'Pago Obra Social',
  otros_ingresos: 'Otros Ingresos',
  // Egresos
  honorarios:     'Honorarios',
  insumos:        'Insumos / Materiales',
  servicios:      'Servicios',
  otros_egresos:  'Otros Egresos',
};

export default function TransactionList() {
  const { filteredTransactions, deleteTransaction } = useFinance();

  if (filteredTransactions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="text-muted">No hay movimientos en este período.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Movimientos</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTransactions.map(transaction => (
          <div 
            key={transaction.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-primary)',
              borderLeft: `4px solid ${transaction.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}`
            }}
          >
            <div>
            <p style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {transaction.patientName ? `${transaction.patientName}` : transaction.description || 'Sin descripción'}
                {transaction.healthInsurance && <span style={{ fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({transaction.healthInsurance})</span>}
                {transaction.category && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    backgroundColor: transaction.type === 'income'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(244, 63, 94, 0.12)',
                    color: transaction.type === 'income'
                      ? 'var(--color-income)'
                      : 'var(--color-expense)',
                    border: `1px solid ${transaction.type === 'income'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(244, 63, 94, 0.25)'}`,
                  }}>
                    {CATEGORY_LABELS[transaction.category] || transaction.category}
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <span>{transaction.date.split('-').reverse().join('/')} {transaction.time ? ` - ${transaction.time}hs` : ''}</span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize' }}>
                  {transaction.paymentMethod === 'cash' ? 'Efectivo' : 
                   transaction.paymentMethod === 'transfer' ? 'Transferencia' : 'Otro'}
                </span>
                <span>•</span>
                 <span style={{ 
                    backgroundColor: transaction.shift === 'morning' ? '#fef3c7' : '#e0f2fe',
                    color: transaction.shift === 'morning' ? '#d97706' : '#0284c7',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                  {transaction.shift === 'morning' ? 'Mañana' : 'Tarde'}
                </span>
                {transaction.description && transaction.description !== transaction.patientName && (
                  <>
                  <span>•</span>
                  <span>{transaction.description}</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span 
                  style={{ 
                    fontWeight: 'bold', 
                    color: transaction.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)',
                    fontSize: '1.1rem'
                  }}
                >
                  {transaction.type === 'income' ? '+' : '-'} 
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(transaction.amount)}
                </span>
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                    fontWeight: '500',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                  title="Saldo acumulado de caja después de este movimiento"
                >
                  Saldo: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(transaction.runningBalance)}
                </span>
              </div>
              <button 
                onClick={() => deleteTransaction(transaction.id)}
                style={{ 
                  background: 'none', 
                  color: 'var(--text-muted)', 
                  padding: '0.25rem',
                  fontSize: '1.25rem',
                  opacity: 0.7
                }}
                className="btn"
                aria-label="Eliminar"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
