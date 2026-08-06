import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function TransactionForm() {
  const { addTransaction } = useFinance();
  
  // Default shift set to 'afternoon' (Tarde)
  const defaultShift = 'afternoon';
  
  // Get current time formatted as HH:mm
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  // Get current date in local time (YYYY-MM-DD)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const localDate = `${year}-${month}-${day}`;

  const CATEGORIES = {
    income: [
      { value: 'copago',         label: 'Copago' },
      { value: 'particular',     label: 'Pago Particular' },
      { value: 'otros_ingresos', label: 'Otros Ingresos' },
    ],
    expense: [
      { value: 'honorarios',     label: 'Honorarios' },
      { value: 'insumos',        label: 'Insumos / Materiales' },
      { value: 'servicios',      label: 'Servicios' },
      { value: 'otros_egresos',  label: 'Otros Egresos' },
    ]
  };

  const [formData, setFormData] = useState({
    description: '',
    amount: '', // visual formatted value
    type: 'income',
    category: 'copago',
    paymentMethod: 'cash',
    date: localDate,
    time: currentTime,
    patientName: '',
    healthInsurance: '',
    shift: defaultShift,
    professional: 'Erika Morales',
    paymentPeriod: 'Semanal',
    extraNotes: ''
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

    let finalDescription = formData.description;
    if (formData.type === 'expense' && formData.category === 'honorarios') {
      finalDescription = `${formData.professional} - ${formData.paymentPeriod}${formData.extraNotes ? ` (${formData.extraNotes})` : ''}`;
    }

    // We pass the raw numeric amount to context, but keep other string fields
    addTransaction({
      ...formData,
      description: finalDescription,
      amount: rawAmount
    });

    const newNow = new Date();
    const newTime = newNow.toTimeString().slice(0, 5);
    const newYear = newNow.getFullYear();
    const newMonth = String(newNow.getMonth() + 1).padStart(2, '0');
    const newDay = String(newNow.getDate()).padStart(2, '0');
    const newLocalDate = `${newYear}-${newMonth}-${newDay}`;

    setFormData(prev => ({
      ...prev,
      description: '',
      extraNotes: '',
      amount: '',
      patientName: '',
      healthInsurance: '',
      date: newLocalDate,
      time: newTime
      // type, category, paymentMethod, shift, professional, paymentPeriod se mantienen para agilizar la carga
    }));
  };

  // Helper getters for dynamic fields
  const isIncome = formData.type === 'income';
  const isHonorarios = formData.type === 'expense' && formData.category === 'honorarios';
  const showPatient = isIncome && (formData.category === 'copago' || formData.category === 'particular');
  const showHealthInsurance = isIncome && formData.category === 'copago';

  const getDescriptionConfig = () => {
    if (isIncome) {
      if (formData.category === 'copago') {
        return { label: 'Concepto / Observaciones', placeholder: 'Ej: Sesión kinesiología, Copago #3...', required: false };
      }
      if (formData.category === 'particular') {
        return { label: 'Concepto / Observaciones', placeholder: 'Ej: Evaluación inicial, Tratamiento completo...', required: false };
      }
      return { label: 'Concepto / Descripción del Ingreso', placeholder: 'Ej: Venta de insumo, Alquiler de espacio...', required: true };
    }
    
    // Egresos
    switch (formData.category) {
      case 'honorarios':
        return { label: 'Profesional / Detalle del Pago', placeholder: '', required: false };
      case 'insumos':
        return { label: 'Detalle de Insumos / Materiales', placeholder: 'Ej: Electrodos, Gel conductor, Barbijos...', required: true };
      case 'servicios':
        return { label: 'Servicio / Proveedor', placeholder: 'Ej: Factura Edesur, Internet Fibra, Alquiler...', required: true };
      case 'otros_egresos':
      default:
        return { label: 'Concepto / Descripción del Gasto', placeholder: 'Ej: Mantenimiento de equipo, Artículos de limpieza...', required: true };
    }
  };

  const descConfig = getDescriptionConfig();

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
              onClick={() => setFormData({ ...formData, type: 'income', category: 'copago' })}
            >
              Ingreso
            </button>
            <button
              type="button"
              className={`btn ${formData.type === 'expense' ? 'btn-primary' : ''}`}
              style={{ flex: 1, backgroundColor: formData.type === 'expense' ? 'var(--color-expense)' : 'var(--bg-tertiary)', color: 'white' }}
              onClick={() => setFormData({ ...formData, type: 'expense', category: 'honorarios' })}
            >
              Egreso
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {CATEGORIES[formData.type].map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
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

        {showPatient && (
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
        )}

        {showHealthInsurance && (
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
        )}

        {isHonorarios ? (
          <>
            <div className="flex-between" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Profesional</label>
                <select
                  className="form-select"
                  value={formData.professional}
                  onChange={(e) => setFormData({ ...formData, professional: e.target.value })}
                >
                  <option value="Erika Morales">Erika Morales</option>
                  <option value="Ariel Jimenez">Ariel Jimenez</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Período de Pago</label>
                <select
                  className="form-select"
                  value={formData.paymentPeriod}
                  onChange={(e) => setFormData({ ...formData, paymentPeriod: e.target.value })}
                >
                  <option value="Semanal">Semanal</option>
                  <option value="Semana 1">Semana 1</option>
                  <option value="Semana 2">Semana 2</option>
                  <option value="Semana 3">Semana 3</option>
                  <option value="Semana 4">Semana 4</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Liquidación de prestaciones..."
                value={formData.extraNotes}
                onChange={(e) => setFormData({ ...formData, extraNotes: e.target.value })}
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label className="form-label">{descConfig.label}</label>
            <input
              type="text"
              className="form-input"
              placeholder={descConfig.placeholder}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required={descConfig.required}
            />
          </div>
        )}

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
