import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function TransactionForm() {
  const { addTransaction } = useFinance();
  
  // Determine default shift based on current hour
  const currentHour = new Date().getHours();
  const defaultShift = (currentHour >= 8 && currentHour < 14) ? 'morning' : 'afternoon';
  
  // Get current time formatted as HH:mm
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  // Get current date in local time (YYYY-MM-DD)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const localDate = `${year}-${month}-${day}`;

  const [formData, setFormData] = useState({
    description: '',
    amount: '', // visual formatted value
    type: 'income',
    paymentMethod: 'cash',
    date: localDate,
    time: currentTime,
    patientName: '',
    healthInsurance: '',
    shift: defaultShift
  });

  const handleAmountChange = (e) => {
    // 1. Get raw input
    let value = e.target.value;
    
    // 2. Allow digits and one comma
    // Remove anything that isn't a digit or comma
    value = value.replace(/[^0-9,]/g, '');
    
    // Ensure only one comma
    const parts = value.split(',');
    if (parts.length > 2) {
      value = parts[0] + ',' + parts.slice(1).join('');
    }

    // 3. Setup for formatting (integer part only for thousands)
    // We only format the integer part (before comma)
    let integerPart = parts[0];
    let decimalPart = parts.length > 1 ? ',' + parts[1] : '';
    
    // Remove leading zeros from integer part unless it's just "0"
    if (integerPart.length > 1 && integerPart.startsWith('0')) {
      integerPart = integerPart.substring(1);
    }
    
    // Add dots for thousands
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    setFormData(prev => ({ ...prev, amount: integerPart + decimalPart }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    // Parse amount: remove dots, replace comma with dot for standard float parsing
    const rawAmount = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));
    
    if (isNaN(rawAmount)) return;

    // We pass the raw numeric amount to context, but keep other string fields
    addTransaction({
      ...formData,
      amount: rawAmount
    });

    setFormData(prev => ({
      ...prev,
      description: '',
      amount: '',
      patientName: '',
      healthInsurance: ''
      // keep type, date, payment method, shift, and maybe update time?
      // Let's reset time to current? Or keep last? Usually current is better.
      // Actually, if doing multiple entries, maybe keep date/time? 
      // Let's reset time to current "now" for next entry? Or just leave it. 
      // User might want to enter another one at same time. Let's leave it.
    }));
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Nueva Transacción</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              className={`btn ${formData.type === 'income' ? 'btn-primary' : ''}`}
              style={{ flex: 1, backgroundColor: formData.type === 'income' ? 'var(--color-income)' : 'var(--bg-tertiary)', color: 'white' }}
              onClick={() => setFormData({ ...formData, type: 'income' })}
            >
              Ingreso
            </button>
            <button
              type="button"
              className={`btn ${formData.type === 'expense' ? 'btn-primary' : ''}`}
              style={{ flex: 1, backgroundColor: formData.type === 'expense' ? 'var(--color-expense)' : 'var(--bg-tertiary)', color: 'white' }}
              onClick={() => setFormData({ ...formData, type: 'expense' })}
            >
              Egreso
            </button>
          </div>
        </div>

        <div className="flex-between" style={{ gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Monto (ARS)</label>
            <input
              type="text"
              className="form-input"
              placeholder="0,00"
              value={formData.amount}
              onChange={handleAmountChange}
              required
            />
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Turno</label>
            <select
              className="form-select"
              value={formData.shift}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
            >
              <option value="morning">M - Mañana</option>
              <option value="afternoon">T - Tarde</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Paciente (Opcional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Nombre del paciente"
            value={formData.patientName}
            onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Obra Social (Opcional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ej: OSDE, PAMI..."
            value={formData.healthInsurance}
            onChange={(e) => setFormData({ ...formData, healthInsurance: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Concepto / Descripción</label>
          <input
            type="text"
            className="form-input"
            placeholder="Detalle (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex-between" style={{ gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ flex: 1 }}>
             <label className="form-label">Hora</label>
             <input
              type="time"
              className="form-input"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Medio de Pago</label>
          <select
              className="form-select"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="other">Otro</option>
            </select>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
          Agregar Transacción
        </button>
      </form>
    </div>
  );
}
