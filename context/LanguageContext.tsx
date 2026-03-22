import React, { createContext, useContext } from 'react';
import { useData } from './DataContext';

type Translations = {
  [key: string]: {
    mr: string;
    en: string;
  };
};

const translations: Translations = {
  totalWork: { mr: 'एकूण काम', en: 'Total Work' },
  received: { mr: 'जमा रक्कम', en: 'Amount Received' },
  totalExpense: { mr: 'एकूण खर्च', en: 'Total Expenses' },
  netProfit: { mr: 'निव्वळ नफा', en: 'Net Profit' },
  pending: { mr: 'बाकी', en: 'Pending' },
  dashboard: { mr: 'हिशोब', en: 'Dashboard' },
  work: { mr: 'काम', en: 'Work' },
  expenses: { mr: 'खर्च', en: 'Expenses' },
  farmers: { mr: 'शेतकरी', en: 'Farmers' },
  settings: { mr: 'सेटिंग्ज', en: 'Settings' },
  reports: { mr: 'अहवाल', en: 'Reports' },
  addWork: { mr: 'काम / जमा जोडा', en: 'Add Work/Payment' },
  addExpense: { mr: 'खर्च जोडा', en: 'Add Expense' },
  addFarmer: { mr: 'नवीन शेतकरी', en: 'Add Farmer' },
  save: { mr: 'सेव्ह करा', en: 'Save' },
  delete: { mr: 'हटवा', en: 'Delete' },
  approve: { mr: 'मंजूर (Approve)', en: 'Approve' },
  reject: { mr: 'रद्द (Reject)', en: 'Reject' },
  backupData: { mr: 'डेटा बॅकअप (Download)', en: 'Backup Data' },
  restoreData: { mr: 'डेटा रिस्टोर (Upload)', en: 'Restore Data' },
  payNow: { mr: 'PAY NOW (ऑनलाईन भरा)', en: 'PAY NOW' },
  downloadReceipt: { mr: 'पावती (Receipt)', en: 'Download Receipt' },
  date: { mr: 'तारीख', en: 'Date' },
  amount: { mr: 'रक्कम', en: 'Amount' },
  type: { mr: 'प्रकार', en: 'Type' },
  details: { mr: 'तपशील', en: 'Details' },
  welcome: { mr: 'स्वागत आहे', en: 'Welcome' },
  logout: { mr: 'बाहेर पडा', en: 'Logout' },
  language: { mr: 'भाषा (Language)', en: 'Language' }
};

interface LanguageContextType {
  t: (key: string) => string;
  lang: 'mr' | 'en';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useData();
  const lang = settings.language || 'mr';

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][lang];
  };

  return (
    <LanguageContext.Provider value={{ t, lang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
