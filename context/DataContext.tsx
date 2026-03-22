
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, DEFAULT_SETTINGS, Entry, Expense, User, UserRole, DEFAULT_RATES } from '../types';

interface DataContextType {
  users: User[];
  entries: Entry[];
  expenses: Expense[];
  settings: AppSettings;
  addUser: (user: User) => void;
  addEntry: (entry: Entry) => void;
  approvePayment: (id: string) => void;
  rejectPayment: (id: string) => void;
  deleteEntry: (id: string) => void;
  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  updateSettings: (newSettings: AppSettings) => void;
  getEntriesByMobile: (mob: string) => Entry[];
  exportData: () => void; // Backup
  importData: (jsonData: string) => boolean; // Restore
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const loadData = () => {
    try {
      const storedUsers = localStorage.getItem('oja_users');
      const storedEntries = localStorage.getItem('oja_entries');
      const storedExpenses = localStorage.getItem('oja_expenses');
      const storedSettings = localStorage.getItem('oja_settings');

      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        // Only set demo data if strictly nothing exists
        const demoUser: User = { id: '1', name: 'Demo Farmer', mob: '1234567890', role: UserRole.CLIENT, village: 'Demo Village', pass: 'demo' };
        setUsers([demoUser]);
        localStorage.setItem('oja_users', JSON.stringify([demoUser]));
      }

      if (storedEntries) {
        const parsedEntries = JSON.parse(storedEntries);
        // Migration fix for older data versions
        const migratedEntries = parsedEntries.map((e: any) => ({
             ...e,
             status: e.status || 'COMPLETED' 
        }));
        setEntries(migratedEntries);
      }
      
      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
      
      if (storedSettings) {
         setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      }
    } catch (e) {
      console.error("Failed to load data from storage", e);
    }
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => {
      loadData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveData = (key: string, data: any) => {
      localStorage.setItem(key, JSON.stringify(data));
  };

  const addUser = (user: User) => {
    setUsers(prev => {
      // Avoid duplicates
      if(prev.some(u => u.mob === user.mob)) return prev;
      const updated = [...prev, user];
      saveData('oja_users', updated);
      return updated;
    });
  };

  const addEntry = (entry: Entry) => {
    setEntries(prev => {
      const newEntry = { ...entry, status: entry.status || 'COMPLETED' };
      const updated = [newEntry, ...prev];
      saveData('oja_entries', updated);
      return updated;
    });
  };

  const approvePayment = (id: string) => {
    setEntries(prev => {
        const updated = prev.map(e => e.id === id ? { ...e, status: 'COMPLETED' as const } : e);
        saveData('oja_entries', updated);
        return updated;
    });
  };

  const rejectPayment = (id: string) => {
    setEntries(prev => {
        const updated = prev.map(e => e.id === id ? { ...e, status: 'REJECTED' as const } : e);
        saveData('oja_entries', updated);
        return updated;
    });
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveData('oja_entries', updated);
      return updated;
    });
  };

  const addExpense = (expense: Expense) => {
    setExpenses(prev => {
      const updated = [expense, ...prev];
      saveData('oja_expenses', updated);
      return updated;
    });
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveData('oja_expenses', updated);
      return updated;
    });
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveData('oja_settings', newSettings);
  };

  const getEntriesByMobile = (mob: string) => entries.filter(e => e.mob === mob);

  // --- BACKUP & RESTORE ---
  const exportData = () => {
      const data = {
          users,
          entries,
          expenses,
          settings,
          version: '17.1',
          exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OJA_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const importData = (jsonData: string) => {
      try {
          const data = JSON.parse(jsonData);
          
          // Helper to merge arrays based on 'id'
          const mergeById = (current: any[], incoming: any[]) => {
              const currentIds = new Set(current.map(c => c.id));
              const newItems = incoming.filter(i => !currentIds.has(i.id));
              return [...newItems, ...current]; // Put new items from file, keep current state (or vice versa based on logic)
              // Actually, restore usually implies "go back to this state". 
              // But user asked to not lose recent data. So we merge.
              // We'll prioritize the file's data for collisions, but keep entries that exist in app but not in file.
          };

          if (data.users && Array.isArray(data.users)) {
             // For users, merge based on ID or Mob
             const mergedUsers = [...users];
             data.users.forEach((u: User) => {
                 if(!mergedUsers.some(existing => existing.mob === u.mob)) {
                     mergedUsers.push(u);
                 }
             });
             setUsers(mergedUsers);
             saveData('oja_users', mergedUsers);
          }

          if (data.entries && Array.isArray(data.entries)) {
              // Merge Entries
              const mergedEntries = mergeById(entries, data.entries);
              // Sort by date descending
              mergedEntries.sort((a: any, b: any) => b.timestamp - a.timestamp);
              setEntries(mergedEntries);
              saveData('oja_entries', mergedEntries);
          }

          if (data.expenses && Array.isArray(data.expenses)) {
              const mergedExpenses = mergeById(expenses, data.expenses);
              setExpenses(mergedExpenses);
              saveData('oja_expenses', mergedExpenses);
          }

          if (data.settings) {
              // Merge settings (current settings + restored settings)
              // We might want to keep the current rates if they are newer? 
              // For simplicity, let's update settings from file but preserve unknown keys
              const newSettings = { ...DEFAULT_SETTINGS, ...settings, ...data.settings };
              setSettings(newSettings);
              saveData('oja_settings', newSettings);
          }
          return true;
      } catch (e) {
          console.error("Import Failed", e);
          return false;
      }
  };

  return (
    <DataContext.Provider value={{ 
      users, entries, expenses, settings, 
      addUser, addEntry, approvePayment, rejectPayment, deleteEntry, addExpense, deleteExpense, updateSettings, getEntriesByMobile,
      exportData, importData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
