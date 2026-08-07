import { useFinance } from '../context/FinanceContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

// RN-006.1 & RN-006.2: Indicador de tendencia contextual y resultado financiero
function TrendBadge({ current, previous, prevBalance, type = 'income' }) {
  const label = prevBalance?.label || 'vs. período anterior';
  const hasPrevTransactions = prevBalance?.hasPrevTransactions ?? prevBalance?.hasData ?? false;
  const hasCurrentTransactions = prevBalance?.hasCurrentTransactions ?? true;
  const hasSystemHistory = prevBalance?.hasSystemHistory ?? false;

  // ── RN-006.1: TRATAMIENTO DE DATOS INSUFICIENTES ──
  // 1. "Primer período registrado": No hay transacciones en el historial del sistema antes del período actual
  if (!hasSystemHistory && !hasPrevTransactions) {
    return <span className="trend-no-data">Primer período registrado</span>;
  }

  // 2. "Sin movimientos en el período anterior" / "Sin movimientos para comparar"
  if (!hasPrevTransactions) {
    if (!hasCurrentTransactions) {
      return <span className="trend-no-data">Sin movimientos para comparar</span>;
    }
    return <span className="trend-no-data">Sin movimientos en el período anterior</span>;
  }

  // 3. "Historial insuficiente para realizar la comparación":
  //    Hubo movimientos en el período comparativo, pero para esta métrica el valor previo es 0 y el actual es distinto de 0
  //    (Evita mostrar +100%, -100% o porcentajes engañosos)
  if (previous === 0 && current !== 0) {
    return <span className="trend-no-data">Historial insuficiente para realizar la comparación</span>;
  }

  // 4. "Sin movimientos para comparar" cuando ambos son 0
  if (previous === 0 && current === 0) {
    return <span className="trend-no-data">Sin movimientos para comparar</span>;
  }

  // ── CÁLCULO DE VARIACIÓN PORCENTUAL VÁLIDA ──
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const absStr = Math.abs(pct).toFixed(1).replace('.', ',');

  // ── RN-006.2: TRATAMIENTO ESPECÍFICO DE RESULTADO NETO ──
  if (type === 'net') {
    if (current > 0) {
      // Superávit: ▲ Verde (NUNCA mostrar ▼ en superávit)
      return (
        <span className="trend-badge trend-up">
          ▲ {pct > 0 ? `+${absStr}%` : pct < 0 ? `-${absStr}%` : '0%'} {label}
        </span>
      );
    } else if (current < 0) {
      // Déficit: ▼ Rojo (NUNCA mostrar ▲ en déficit)
      return (
        <span className="trend-badge trend-down">
          ▼ {pct < 0 ? `-${absStr}%` : pct > 0 ? `+${absStr}%` : '0%'} {label}
        </span>
      );
    } else {
      // Resultado neutro: ▬ Gris
      return (
        <span className="trend-badge trend-neutral">
          ▬ 0% {label}
        </span>
      );
    }
  }

  // ── INGRESOS Y EGRESOS ──
  if (pct > 0) {
    const isFavorable = type !== 'expense';
    const badgeClass = isFavorable ? 'trend-up' : 'trend-down';
    const symbol = isFavorable ? '▲' : '▼';
    return (
      <span className={`trend-badge ${badgeClass}`}>
        {symbol} +{absStr}% {label}
      </span>
    );
  } else if (pct < 0) {
    const isFavorable = type === 'expense';
    const badgeClass = isFavorable ? 'trend-up' : 'trend-down';
    const symbol = isFavorable ? '▲' : '▼';
    return (
      <span className={`trend-badge ${badgeClass}`}>
        {symbol} -{absStr}% {label}
      </span>
    );
  } else {
    return (
      <span className="trend-badge trend-neutral">
        ▬ 0% {label}
      </span>
    );
  }
}

export default function BalanceDashboard() {
  const {
    getBalance,
    getPreviousPeriodBalance,
    filter,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    changePresetFilter,
    filteredTransactions
  } = useFinance();

  const balance = getBalance();
  const prevBalance = getPreviousPeriodBalance();

  // ── RF-005: Export dropdown state ────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportWrapperRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    if (!exportOpen) return;
    const handleOutside = (e) => {
      if (exportWrapperRef.current && !exportWrapperRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [exportOpen]);

  const buildExportPayload = useCallback(() => ({
    filter,
    periodLabel: getPeriodLabel(),
    startDate,
    endDate,
    balance,
    prevBalance,
    categoryBreakdown: getCategoryBreakdown(),
    transactions: filteredTransactions,
    generatedAt: new Date(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [filter, startDate, endDate, filteredTransactions]);

  const handleExport = useCallback(async (format) => {
    setExportOpen(false);
    if (filteredTransactions.length === 0) {
      alert('No existen datos para el período seleccionado. No se generará el archivo.');
      return;
    }
    setIsExporting(true);
    try {
      const payload = buildExportPayload();
      if (format === 'excel') await exportToExcel(payload);
      else await exportToPDF(payload);
    } catch (err) {
      console.error('Error al exportar:', err);
      alert('Ocurrió un error al generar el archivo. Por favor, intentá nuevamente.');
    } finally {
      setIsExporting(false);
    }
  }, [filteredTransactions, buildExportPayload]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  // Etiqueta legible del período activo
  const getPeriodLabel = () => {
    const now = new Date();
    if (filter === 'daily') {
      return now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (filter === 'weekly') {
      return `Semana del ${startDate.split('-').reverse().join('/')} al ${endDate.split('-').reverse().join('/')}`;
    }
    if (filter === 'monthly') {
      return now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    }
    return `${startDate.split('-').reverse().join('/')} – ${endDate.split('-').reverse().join('/')}`;
  };

  const CATEGORY_LABELS = {
    copago:         'Copago',
    particular:     'Pago Particular',
    obra_social:    'Pago Obra Social',
    otros_ingresos: 'Otros Ingresos',
    honorarios:     'Honorarios',
    insumos:        'Insumos / Materiales',
    servicios:      'Servicios',
    otros_egresos:  'Otros Egresos',
  };

  // Build category breakdown from filtered transactions
  const getCategoryBreakdown = () => {
    const incomeMap = {};
    const expenseMap = {};

    filteredTransactions.forEach(t => {
      const cat = t.category || (t.type === 'income' ? 'otros_ingresos' : 'otros_egresos');
      const val = Number(t.amount);
      if (t.type === 'income') {
        incomeMap[cat] = (incomeMap[cat] || 0) + val;
      } else {
        expenseMap[cat] = (expenseMap[cat] || 0) + val;
      }
    });

    const incomeEntries = Object.entries(incomeMap).sort((a, b) => b[1] - a[1]);
    const expenseEntries = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);

    return { incomeEntries, expenseEntries };
  };

  const categoryBreakdown = getCategoryBreakdown();

  // Formula: (Monto Categoria * 100) / Total Egresos (o Total Ingresos)
  const formatPct = (amount, total) => {
    if (!total || total === 0) return '0%';
    const pct = (amount * 100) / total;
    return pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
  };

  // Calculate daily breakdown for the current date range with running balance (RN-007)
  const getDailyBreakdown = () => {
    const dailyData = {};
    filteredTransactions.forEach(t => {
      if (!dailyData[t.date]) {
        dailyData[t.date] = { income: 0, expense: 0, total: 0 };
      }
      if (t.type === 'income') {
        dailyData[t.date].income += Number(t.amount);
      } else {
        dailyData[t.date].expense += Number(t.amount);
      }
      dailyData[t.date].total = dailyData[t.date].income - dailyData[t.date].expense;
    });

    // Sort ascending to calculate running balance chronologically
    const sortedDates = Object.keys(dailyData).sort((a, b) => a.localeCompare(b));

    // RN-007.1 & RN-007.2: Acumulación progresiva sobre netos diarios desde 0 en t0
    let currentRunning = 0;
    const breakdown = [];

    sortedDates.forEach(date => {
      const dayData = dailyData[date];
      currentRunning += dayData.total;
      breakdown.push({
        date,
        ...dayData,
        runningBalance: currentRunning
      });
    });

    // Return descending (newest first) for UI
    return breakdown.reverse();
  };

  const dailyBreakdown = getDailyBreakdown();

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* ── Selector de Período ── */}
      {/* ── Selector de Período ── */}
      <div className="date-picker-container">
        {/* Fila Superior: Título + Badge de Período + Botón Exportar */}
        <div className="date-picker-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800' }}>
              <span className="section-icon">📊</span>Balance
            </h2>

            {/* RF-003: Etiqueta del período activo */}
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: 'var(--bg-primary)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--bg-tertiary)'
            }}>
              <span>📅</span>
              <span style={{ textTransform: 'capitalize' }}>{getPeriodLabel()}</span>
            </div>
          </div>

          {/* RF-005: Botón Exportar con dropdown */}
          <div className="export-btn-wrapper" ref={exportWrapperRef}>
            <button
              type="button"
              className={`export-btn${exportOpen ? ' open' : ''}`}
              onClick={() => setExportOpen(prev => !prev)}
              disabled={isExporting}
              title="Exportar el balance del período actual"
            >
              {isExporting ? (
                <>
                  <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>⏳</span>
                  Exportando…
                </>
              ) : (
                <>
                  <span>⬇️</span>
                  Exportar
                  <span className="export-chevron">▼</span>
                </>
              )}
            </button>

            {exportOpen && !isExporting && (
              <div className="export-dropdown" role="menu">
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => handleExport('excel')}
                  role="menuitem"
                >
                  <span className="item-icon">📗</span>
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="export-dropdown-item"
                  onClick={() => handleExport('pdf')}
                  role="menuitem"
                >
                  <span className="item-icon">📄</span>
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fila Inferior: Filtros Preset + Inputs de Fecha */}
        <div className="date-picker-controls">
          {/* RF-001: Botones de preset */}
          <div className="preset-group">
            <button
              type="button"
              className={`preset-tab ${filter === 'daily' ? 'active' : ''}`}
              onClick={() => changePresetFilter('daily')}
            >
              Diario
            </button>
            <button
              type="button"
              className={`preset-tab ${filter === 'weekly' ? 'active' : ''}`}
              onClick={() => changePresetFilter('weekly')}
            >
              Semanal
            </button>
            <button
              type="button"
              className={`preset-tab ${filter === 'monthly' ? 'active' : ''}`}
              onClick={() => changePresetFilter('monthly')}
            >
              Mensual
            </button>
            <button
              type="button"
              className={`preset-tab ${filter === 'custom' ? 'active' : ''}`}
              onClick={() => changePresetFilter('custom')}
            >
              Personalizado
            </button>
          </div>

          {/* RF-001: Inputs de rango (deshabilitados cuando no es 'custom', siempre visibles) */}
          <div className="date-range-inputs">
            <div className={`date-input-wrapper${filter !== 'custom' ? ' disabled' : ''}`}>
              <span className="date-input-label">Desde</span>
              <input
                type="date"
                className="date-input-field"
                value={startDate}
                disabled={filter !== 'custom'}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ color: 'var(--text-muted)', fontWeight: '600' }}>–</div>
            <div className={`date-input-wrapper${filter !== 'custom' ? ' disabled' : ''}`}>
              <span className="date-input-label">Hasta</span>
              <input
                type="date"
                className="date-input-field"
                value={endDate}
                disabled={filter !== 'custom'}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="dashboard-grid">

        {/* Tarjeta Ingresos y Egresos del Período */}
        <div className="kpi-card kpi-card-hero">
          <div className="flow-container">
            {/* Ingresos */}
            <div className="flow-section">
              <span className="kpi-icon">💰</span>
              <span className="tag-badge tag-badge-income">Ingresos</span>
              <span className="kpi-title">Ingresos del Período</span>
              <span className="kpi-value" style={{ color: 'var(--color-income)' }}>
                {formatCurrency(balance.income)}
              </span>
              {/* RF-006 */}
              <TrendBadge
                current={balance.income}
                previous={prevBalance.income}
                prevBalance={prevBalance}
                type="income"
              />
            </div>

            <div className="flow-divider"></div>

            {/* Egresos */}
            <div className="flow-section" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
              <span className="kpi-icon" style={{ display: 'block', textAlign: 'right' }}>💸</span>
              <span className="tag-badge tag-badge-expense">Egresos</span>
              <span className="kpi-title">Egresos del Período</span>
              <span className="kpi-value" style={{ color: 'var(--color-expense)' }}>
                {formatCurrency(balance.expense)}
              </span>
              {/* RF-006 */}
              <TrendBadge
                current={balance.expense}
                previous={prevBalance.expense}
                prevBalance={prevBalance}
                type="expense"
              />
            </div>
          </div>
        </div>

        {/* Tarjeta Neto del Período (RN-007.3: Coherente en todos los filtros) */}
        <div
          className={`kpi-card kpi-card-net-full ${balance.total > 0 ? 'glow-income' : balance.total < 0 ? 'glow-expense' : ''}`}
          style={{
            backgroundColor: balance.total > 0 ? 'rgba(16, 185, 129, 0.02)' : balance.total < 0 ? 'rgba(244, 63, 94, 0.02)' : 'rgba(148, 163, 184, 0.02)'
          }}
        >
          <div>
            <span className="kpi-icon">📈</span>
            <span className="kpi-title">Neto del Período</span>
            <div className="kpi-value" style={{
              color: balance.total > 0 ? 'var(--color-income)' : balance.total < 0 ? 'var(--color-expense)' : 'var(--text-secondary)',
              marginTop: '0.25rem'
            }}>
              {balance.total > 0 ? `+${formatCurrency(balance.total)}` : formatCurrency(balance.total)}
            </div>
            {/* RF-006 */}
            <TrendBadge
              current={balance.total}
              previous={prevBalance.total}
              prevBalance={prevBalance}
              type="net"
            />
          </div>
          <span className="kpi-subtext" style={{
            color: balance.total > 0 ? 'var(--color-income)' : balance.total < 0 ? 'var(--color-expense)' : 'var(--text-secondary)',
            fontWeight: '700',
            opacity: 0.85
          }}>
            {balance.total > 0 ? '▲ Superávit' : balance.total < 0 ? '▼ Déficit' : '▬ Resultado neutro'}
          </span>
        </div>
      </div>

      {/* ── Desglose por Categoría ── */}
      {(categoryBreakdown.incomeEntries.length > 0 || categoryBreakdown.expenseEntries.length > 0) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            <span className="section-icon">🗂️</span>Desglose y Ponderación por Categoría
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Ingresos */}
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-income)', marginBottom: '0.75rem' }}>
                Ingresos (% sobre Total Ingresos)
              </p>
              {categoryBreakdown.incomeEntries.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin ingresos en el período.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {categoryBreakdown.incomeEntries.map(([cat, total]) => {
                    const pctString = formatPct(total, balance.income);
                    const pctNumber = balance.income > 0 ? (total * 100) / balance.income : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.83rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--color-income)', fontWeight: '600' }}>
                              {formatCurrency(total)}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--color-income)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              minWidth: '40px',
                              textAlign: 'center',
                              border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                              {pctString}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: '5px', borderRadius: '3px', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                          <div style={{
                            height: '100%',
                            borderRadius: '3px',
                            backgroundColor: 'var(--color-income)',
                            width: `${pctNumber}%`,
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Egresos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-expense)', margin: 0 }}>
                  Egresos (% sobre Total Egresos)
                </p>
                {balance.income > 0 ? (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: balance.expense > balance.income ? 'var(--color-expense)' : 'var(--text-secondary)',
                    backgroundColor: balance.expense > balance.income ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    border: `1px solid ${balance.expense > balance.income ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
                  }}>
                    {balance.expense > balance.income ? '⚠️ ' : ''}
                    Consumo: {((balance.expense * 100) / balance.income).toFixed(0)}% del ingreso
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Sin ingresos en el período
                  </span>
                )}
              </div>

              {categoryBreakdown.expenseEntries.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin egresos en el período.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {categoryBreakdown.expenseEntries.map(([cat, total]) => {
                    const pctString = formatPct(total, balance.expense);
                    const pctNumber = balance.expense > 0 ? (total * 100) / balance.expense : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', fontSize: '0.83rem' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--color-expense)', fontWeight: '600' }}>
                              {formatCurrency(total)}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: 'rgba(244, 63, 94, 0.12)',
                              color: 'var(--color-expense)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              minWidth: '40px',
                              textAlign: 'center',
                              border: '1px solid rgba(244, 63, 94, 0.2)'
                            }}>
                              {pctString}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: '5px', borderRadius: '3px', backgroundColor: 'rgba(244, 63, 94, 0.1)' }}>
                          <div style={{
                            height: '100%',
                            borderRadius: '3px',
                            backgroundColor: 'var(--color-expense)',
                            width: `${pctNumber}%`,
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detalle Diario ── */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          <span className="section-icon">📋</span>Detalle Diario
        </h3>
        {dailyBreakdown.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
            No hay movimientos registrados en este rango de fechas.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Fecha</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Ingresos</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Egresos</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Neto Diario</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((day) => (
                  <tr
                    key={day.date}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background-color 0.2s'
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                      {day.date.split('-').reverse().join('/')}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--color-income)', fontWeight: '500' }}>
                      {day.income > 0 ? `+${formatCurrency(day.income)}` : formatCurrency(day.income)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: day.expense > 0 ? 'var(--color-expense)' : 'var(--text-muted)' }}>
                      {day.expense > 0 ? `-${formatCurrency(day.expense)}` : formatCurrency(day.expense)}
                    </td>
                    <td style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color: day.total >= 0 ? 'var(--text-primary)' : 'var(--color-expense)'
                    }}>
                      {day.total > 0 ? `+${formatCurrency(day.total)}` : formatCurrency(day.total)}
                    </td>
                    <td style={{
                      padding: '0.75rem 0.5rem',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      color: day.runningBalance > 0
                        ? 'var(--color-income)'
                        : day.runningBalance < 0
                          ? 'var(--color-expense)'
                          : 'var(--text-secondary)'
                    }}>
                      {day.runningBalance > 0 ? `+${formatCurrency(day.runningBalance)}` : formatCurrency(day.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
