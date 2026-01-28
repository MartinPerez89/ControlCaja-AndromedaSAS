import { createContext, useContext, useState, useEffect } from 'react';

const FinanceContext = createContext();

export const useFinance = () => {
  return useContext(FinanceContext);
};

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('finance-tracker-transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [filter, setFilter] = useState('daily'); // Default focus: Daily
  
  // Initialize with local today's date
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const getFilteredTransactions = () => {
    const now = new Date();
    
    return transactions.filter(t => {
       // Daily filter: use selectedDate
       if (filter === 'daily') {
          return t.date === selectedDate;
       } 
       
       if (filter === 'weekly') {
         const oneWeekAgo = new Date();
         oneWeekAgo.setDate(now.getDate() - 7);
         return new Date(t.date) >= oneWeekAgo;
       }
       
       if (filter === 'monthly') {
         // Check Month and Year of selectedDate (allows navigating months too if we wanted, 
         // but for now stick to "Current Month" as implied by "Monthly" usually... 
         // OR, better, use the selectedDate's month to allow exploring past months?
         // User asked to "show movements of selected day". 
         // Let's keep Monthly as "Current Month" or "Month of Selected Date". 
         // "Month of Selected Date" is powerful. Let's do that.
         const [sYear, sMonth] = selectedDate.split('-');
         const [tYear, tMonth] = t.date.split('-');
         return tYear === sYear && tMonth === sMonth;
       }
       
       return true; // 'all'
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const getBalance = () => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    return {
      income,
      expense,
      total: income - expense
    };
  };

  return (
    <FinanceContext.Provider value={{ 
      transactions, 
      filteredTransactions, 
      filter, 
      setFilter, 
      selectedDate,
      setSelectedDate,
      addTransaction, 
      deleteTransaction, 
      getBalance 
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
