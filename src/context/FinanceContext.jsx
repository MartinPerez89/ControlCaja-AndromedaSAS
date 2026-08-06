/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const FinanceContext = createContext();

export const useFinance = () => {
  return useContext(FinanceContext);
};

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Devuelve el lunes de la semana a la que pertenece 'date'
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom, 1=lun...6=sab
  const diff = (day === 0 ? -6 : 1 - day); // ajuste para que semana empiece en lunes
  d.setDate(d.getDate() + diff);
  return d;
};

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('finance-tracker-transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // RF-002: El filtro predeterminado siempre es 'daily' al iniciar (no se persiste)
  const [filter, setFilter] = useState('daily');

  const [startDate, setStartDateState] = useState(() => {
    return formatDate(new Date());
  });

  const [endDate, setEndDateState] = useState(() => {
    return formatDate(new Date());
  });

  useEffect(() => {
    localStorage.setItem('finance-tracker-transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction) => {
    setTransactions(prev => [
      { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...transaction },
      ...prev
    ]);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const getTransactionsWithRunningBalance = () => {
    const sorted = [...transactions].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      const timeCompare = timeA.localeCompare(timeB);
      if (timeCompare !== 0) return timeCompare;
      return a.createdAt.localeCompare(b.createdAt);
    });

    let running = 0;
    // Arrastrar el saldo previo acumulado antes de startDate
    sorted.forEach(t => {
      if (t.date < startDate) {
        const val = Number(t.amount);
        if (t.type === 'income') running += val;
        else running -= val;
      }
    });

    const runningMap = {};
    sorted.forEach(t => {
      if (t.date >= startDate) {
        const val = Number(t.amount);
        if (t.type === 'income') {
          running += val;
        } else {
          running -= val;
        }
        runningMap[t.id] = running;
      }
    });

    return runningMap;
  };

  const getFilteredTransactions = () => {
    const runningBalances = getTransactionsWithRunningBalance();

    const filtered = transactions.filter(t => {
      return t.date >= startDate && t.date <= endDate;
    });

    return filtered.map(t => ({
      ...t,
      runningBalance: runningBalances[t.id] || 0
    }));
  };

  const filteredTransactions = getFilteredTransactions();

  const getBalance = () => {
    let initialBalance = 0;
    let income = 0;
    let expense = 0;

    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      const timeCompare = timeA.localeCompare(timeB);
      if (timeCompare !== 0) return timeCompare;
      return a.createdAt.localeCompare(b.createdAt);
    });

    sortedTransactions.forEach(t => {
      const val = Number(t.amount);
      const isBefore = t.date < startDate;
      const isIn = t.date >= startDate && t.date <= endDate;

      // Arrastrar saldo acumulado previo a startDate
      if (isBefore) {
        if (t.type === 'income') {
          initialBalance += val;
        } else {
          initialBalance -= val;
        }
      } else if (isIn) {
        if (t.type === 'income') {
          income += val;
        } else {
          expense += val;
        }
      }
    });

    return {
      initialBalance,
      income,
      expense,
      total: income - expense,
      finalBalance: initialBalance + (income - expense)
    };
  };

  // RF-006: Calcula ingresos/egresos/neto del período anterior equivalente según el filtro activo
  const getPreviousPeriodBalance = () => {
    const parseLocalDate = (dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    let prevStartDateStr = '';
    let prevEndDateStr = '';
    let label = 'vs. período anterior';

    if (filter === 'daily') {
      const d = parseLocalDate(startDate);
      d.setDate(d.getDate() - 1);
      prevStartDateStr = formatDate(d);
      prevEndDateStr = prevStartDateStr;
      label = 'vs. ayer';
    } else if (filter === 'weekly') {
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 7);
      prevStartDateStr = formatDate(start);
      prevEndDateStr = formatDate(end);
      label = 'vs. semana anterior';
    } else if (filter === 'monthly') {
      const start = parseLocalDate(startDate);
      const year = start.getFullYear();
      const month = start.getMonth(); // 0-indexed
      const prevFirst = new Date(year, month - 1, 1);
      const prevLast = new Date(year, month, 0);
      prevStartDateStr = formatDate(prevFirst);
      prevEndDateStr = formatDate(prevLast);
      label = 'vs. mes anterior';
    } else {
      // Custom: N días inmediatamente anteriores a startDate
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const prevEnd = new Date(start.getTime());
      prevEnd.setDate(prevEnd.getDate() - 1);

      const prevStart = new Date(prevEnd.getTime());
      prevStart.setDate(prevStart.getDate() - (diffDays - 1));

      prevStartDateStr = formatDate(prevStart);
      prevEndDateStr = formatDate(prevEnd);
      label = 'vs. período anterior';
    }

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.date >= prevStartDateStr && t.date <= prevEndDateStr) {
        const val = Number(t.amount);
        if (t.type === 'income') income += val;
        else expense += val;
      }
    });

    const hasPrevTransactions = transactions.some(t => t.date >= prevStartDateStr && t.date <= prevEndDateStr);
    const hasCurrentTransactions = transactions.some(t => t.date >= startDate && t.date <= endDate);
    const hasSystemHistory = transactions.some(t => t.date < startDate);

    return {
      income,
      expense,
      total: income - expense,
      hasData: hasPrevTransactions,
      hasPrevTransactions,
      hasCurrentTransactions,
      hasSystemHistory,
      label,
      prevStartDate: prevStartDateStr,
      prevEndDate: prevEndDateStr,
    };
  };

  // RF-001: Nuevos presets: daily, weekly, monthly, custom
  const changePresetFilter = (presetName) => {
    setFilter(presetName);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (presetName === 'daily') {
      const todayStr = formatDate(now);
      setStartDateState(todayStr);
      setEndDateState(todayStr);
    } else if (presetName === 'weekly') {
      const weekStart = getWeekStart(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      setStartDateState(formatDate(weekStart));
      setEndDateState(formatDate(weekEnd));
    } else if (presetName === 'monthly') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      setStartDateState(formatDate(firstDay));
      setEndDateState(formatDate(lastDay));
    } else if (presetName === 'custom') {
      // No cambia las fechas: el usuario las define manualmente
      return;
    }
  };

  const handleStartDateChange = (val) => {
    setStartDateState(val);
    setFilter('custom');
  };

  const handleEndDateChange = (val) => {
    setEndDateState(val);
    setFilter('custom');
  };

  return (
    <FinanceContext.Provider value={{
      transactions,
      filteredTransactions,
      filter,
      setFilter,
      startDate,
      setStartDate: handleStartDateChange,
      endDate,
      setEndDate: handleEndDateChange,
      changePresetFilter,
      addTransaction,
      deleteTransaction,
      getBalance,
      getPreviousPeriodBalance
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
