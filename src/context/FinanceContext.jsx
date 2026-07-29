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
    // Solo arrastrar el saldo previo acumulado si el filtro activo es 'custom'
    if (filter === 'custom') {
      sorted.forEach(t => {
        if (t.date < startDate) {
          const val = Number(t.amount);
          if (t.type === 'income') running += val;
          else running -= val;
        }
      });
    }

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

      // Arrastrar saldo acumulado previo ÚNICAMENTE en el filtro 'custom'
      if (isBefore && filter === 'custom') {
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

  // RF-004: Calcula ingresos/egresos/neto del mes calendario anterior
  const getPreviousPeriodBalance = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const prevFirst = formatDate(new Date(year, month - 1, 1));
    const prevLast = formatDate(new Date(year, month, 0));

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.date >= prevFirst && t.date <= prevLast) {
        const val = Number(t.amount);
        if (t.type === 'income') income += val;
        else expense += val;
      }
    });

    const hasData = transactions.some(t => t.date >= prevFirst && t.date <= prevLast);

    return {
      income,
      expense,
      total: income - expense,
      hasData
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
