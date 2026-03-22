
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext'; // Added
import { Card, Button, Input, Modal } from './UI';
import { Entry, Expense, WorkType, ExpenseType, User, UserRole } from '../types';
import { formatCurrency, formatDate, generatePDF, openWhatsApp, openSMS, WORK_TYPE_LABELS, EXPENSE_TYPE_LABELS } from '../utils';
import { Plus, Trash2, FileText, TrendingUp, TrendingDown, Settings, Users, MessageCircle, MessageSquare, CheckCircle, Clock, XCircle, Download, Upload, BarChart2, Tractor, Cloud, CloudOff, Send } from 'lucide-react';
import { PieChart, Pie, Legend, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { entries, expenses, users, settings, deleteEntry, deleteExpense, addUser, addEntry, approvePayment, rejectPayment, addExpense, updateSettings, exportData, importData } = useData();
  const { showNotification } = useNotification();
  const { t } = useLanguage(); // Translations
  const [activeTab, setActiveTab] = useState<'overview' | 'work' | 'expenses' | 'farmers' | 'drivers' | 'settings'>('overview');
  
  // Date Filters
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [showAddWork, setShowAddWork] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddFarmer, setShowAddFarmer] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);

  // Feature 6: SMS Confirmation Modal State
  const [smsModal, setSmsModal] = useState<{ isOpen: boolean; entry: Entry | null; user: User | null; pending: number }>({ 
      isOpen: false, entry: null, user: null, pending: 0 
  });

  // Form States
  const [newWork, setNewWork] = useState<Partial<Entry>>({ type: 'WORK', date: new Date().toISOString().split('T')[0] });
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ date: new Date().toISOString().split('T')[0] });
  const [newFarmer, setNewFarmer] = useState<Partial<User>>({ role: UserRole.CLIENT });
  const [newDriver, setNewDriver] = useState<Partial<User>>({ role: UserRole.DRIVER });

  // Settings State
  const [localSettings, setLocalSettings] = useState(settings);
  const [customWork, setCustomWork] = useState({ name: '', rate: '' });
  const [backupFile, setBackupFile] = useState<File | null>(null);

  // Filtered Data
  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.date >= startDate && e.date <= endDate && e.status !== 'PENDING' && e.status !== 'REJECTED');
  }, [entries, startDate, endDate]);

  const pendingEntries = useMemo(() => {
    return entries.filter(e => e.status === 'PENDING');
  }, [entries]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= startDate && e.date <= endDate);
  }, [expenses, startDate, endDate]);

  const uniqueVillages = useMemo(() => {
     return Array.from(new Set(users.map(u => u.village).filter(Boolean)));
  }, [users]);

  // Stats
  const totalWork = filteredEntries.filter(e => e.type === 'WORK').reduce((acc, curr) => acc + curr.amount, 0);
  const totalReceived = filteredEntries.filter(e => e.type === 'PAYMENT').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalWork - totalExpenses;
  
  // Chart Data - Work Types
  const workTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.filter(e => e.type === 'WORK').forEach(e => {
      const typeKey = e.workType || 'Other';
      const label = WORK_TYPE_LABELS[typeKey] || typeKey;
      counts[label] = (counts[label] || 0) + e.amount;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredEntries]);

  // Chart Data - Monthly Overview
  const monthlyData = useMemo(() => {
      const months: Record<string, {income: number, expense: number}> = {};
      
      // Init last 6 months
      for(let i=5; i>=0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toLocaleString('default', { month: 'short' });
          months[key] = { income: 0, expense: 0 };
      }

      entries.forEach(e => {
          if(e.type === 'WORK' && e.status === 'COMPLETED') {
              const m = new Date(e.date).toLocaleString('default', { month: 'short' });
              if(months[m]) months[m].income += e.amount;
          }
      });

      expenses.forEach(e => {
          const m = new Date(e.date).toLocaleString('default', { month: 'short' });
          if(months[m]) months[m].expense += e.amount;
      });

      return Object.keys(months).map(k => ({ name: k, income: months[k].income, expense: months[k].expense }));
  }, [entries, expenses]);

  // Helper to Calculate Pending
  const getPendingAmount = (userId: string) => {
      const uEntries = entries.filter(e => e.userId === userId && e.status === 'COMPLETED');
      const w = uEntries.filter(e => e.type === 'WORK').reduce((a,c) => a+c.amount, 0);
      const p = uEntries.filter(e => e.type === 'PAYMENT').reduce((a,c) => a+c.amount, 0);
      return w - p;
  };

  // Handlers
  const handleAddWork = () => {
    if (!newWork.userId || !newWork.amount) return showNotification("कृपया शेतकरी आणि रक्कम निवडा", 'error');
    const user = users.find(u => u.id === newWork.userId);
    
    const entryData = {
      ...newWork,
      id: Date.now().toString(),
      timestamp: Date.now(),
      mob: user?.mob || '',
      status: 'COMPLETED',
      type: newWork.type as 'WORK' | 'PAYMENT'
    } as Entry;

    addEntry(entryData);
    setShowAddWork(false);
    showNotification("माहिती यशस्वीरित्या जतन केली!", 'success');

    // Feature 6: Trigger SMS Modal
    if(user && newWork.type === 'WORK') {
        // Calculate new pending (Current + This work amount)
        // Note: getPendingAmount uses 'entries' from context which might not update instantly in this render cycle
        // So we calculate manually
        const currentPending = getPendingAmount(user.id); 
        const newPending = currentPending + (entryData.amount || 0);
        
        setSmsModal({
            isOpen: true,
            entry: entryData,
            user: user,
            pending: newPending
        });
    }

    setNewWork({ type: 'WORK', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.type) return showNotification("कृपया खर्चाचा प्रकार आणि रक्कम भरा", 'error');
    addExpense({
      ...newExpense,
      id: Date.now().toString(),
      timestamp: Date.now()
    } as Expense);
    setShowAddExpense(false);
    showNotification("खर्च ॲड केला!", 'success');
    setNewExpense({ date: new Date().toISOString().split('T')[0] });
  };

  const handleAddFarmer = () => {
    if (!newFarmer.name || !newFarmer.mob) return showNotification("नाव आणि मोबाईल नंबर आवश्यक आहे", 'error');
    const password = '123456';
    addUser({
      ...newFarmer,
      id: Date.now().toString(),
      role: UserRole.CLIENT,
      pass: password
    } as User);
    
    const message = `नमस्कार ${newFarmer.name}, OJA Digital Farm मध्ये तुमचे स्वागत आहे.\nLogin ID: ${newFarmer.mob}\nPass: ${password}`;
    
    setShowAddFarmer(false);
    showNotification("नवीन शेतकरी तयार केला!", 'success');
    setNewFarmer({ role: UserRole.CLIENT });
    
    setTimeout(() => {
        if(confirm("शेतकरी ॲड झाला आहे! त्याला लॉगिन माहितीचा SMS पाठवायचा आहे का?")) {
            openSMS(newFarmer.mob!, message);
        }
    }, 300);
  };

  const handleAddDriver = () => {
    if (!newDriver.name || !newDriver.mob) return showNotification("नाव आणि मोबाईल नंबर आवश्यक आहे", 'error');
    const password = 'driver';
    addUser({
      ...newDriver,
      id: Date.now().toString(),
      role: UserRole.DRIVER,
      pass: password
    } as User);
    
    setShowAddDriver(false);
    showNotification("नवीन ड्रायव्हर तयार केला!", 'success');
    setNewDriver({ role: UserRole.DRIVER });
  };

  const handlePaySalary = (driver: User) => {
      const amountStr = prompt(`Enter Salary Amount for ${driver.name}:`);
      if(amountStr) {
          const amount = parseFloat(amountStr);
          if(amount > 0) {
              addExpense({
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  type: ExpenseType.SALARY,
                  amount: amount,
                  date: new Date().toISOString().split('T')[0],
                  details: `Salary to ${driver.name}`
              });
              showNotification(`Salary of ${amount} paid to ${driver.name}`, 'success');
          }
      }
  };

  const saveSettings = () => {
    updateSettings(localSettings);
    showNotification("सेटिंग्ज अपडेट केल्या!", 'success');
  };

  // RESTORED: Add Custom Work Type
  const addCustomWorkType = () => {
    if(!customWork.name || !customWork.rate) return showNotification("नाव आणि दर दोन्ही आवश्यक आहेत", 'error');
    const newRates = { ...localSettings.rates, [customWork.name]: parseFloat(customWork.rate) };
    const updated = { ...localSettings, rates: newRates };
    setLocalSettings(updated);
    setCustomWork({ name: '', rate: '' });
  };

  // RESTORED: Remove Work Type
  const removeWorkType = (key: string) => {
      const newRates = { ...localSettings.rates };
      delete newRates[key];
      setLocalSettings({ ...localSettings, rates: newRates });
  };

  // Safe Restore Handler
  const handleRestore = async () => {
      if(!backupFile) return showNotification("कृपया बॅकअप फाईल निवडा", 'error');
      
      try {
          const reader = new FileReader();
          reader.onload = (e) => {
              const text = e.target?.result;
              if(typeof text === 'string') {
                  const success = importData(text);
                  if(success) {
                      showNotification("डेटा यशस्वीरित्या मर्ज/रिस्टोर झाला!", 'success');
                      setBackupFile(null);
                      // Reset file input by ID or ref in real DOM, but react state null helps.
                      // Ideally reload to refresh context
                      setTimeout(() => window.location.reload(), 1500);
                  } else {
                      showNotification("फाईल करप्ट आहे किंवा फॉरमॅट चुकीचा आहे.", 'error');
                  }
              }
          };
          reader.readAsText(backupFile);
      } catch (error) {
          console.error(error);
          showNotification("फाईल वाचताना एरर आला.", 'error');
      }
  };

  // Improved Handlers for Approve/Reject
  const handleApprove = (id: string) => {
      approvePayment(id);
      showNotification("Approved!", 'success');
      
      // Feature 6: Trigger SMS on Approval
      const entry = entries.find(e => e.id === id);
      const user = users.find(u => u.id === entry?.userId);
      if(entry && user && entry.type === 'WORK') {
          // Calculate pending including this approved one
          const currentPending = getPendingAmount(user.id);
          // If state hasn't updated yet, add manually? No, approvePayment updates state instantly in React 18 usually or next render
          // Let's assume calculate fresh
          // A safer bet is to pass the calculated amount
          setSmsModal({
              isOpen: true,
              entry: entry,
              user: user,
              pending: currentPending // This might be slightly off if state lags, but usually fine
          });
      }
  };

  const handleReject = (id: string) => {
      rejectPayment(id);
      showNotification("Rejected!", 'error');
  };
  
  // Feature 6: Message Generator
  const generateMessage = () => {
      const { entry, user, pending } = smsModal;
      if(!entry || !user) return "";
      
      const workName = WORK_TYPE_LABELS[entry.workType as string] || entry.workType;
      const date = formatDate(entry.timestamp);
      const amt = formatCurrency(entry.amount);
      const total = formatCurrency(pending);
      
      return `नमस्कार ${user.name},
OJA Tractor कडून काम पूर्ण झाले.
काम: ${workName}
तारीख: ${date}
रक्कम: ${amt}

तुमची एकूण बाकी: ${total}

- ${settings.ownerName} (${settings.ownerMob})`;
  };

  return (
    <div className="pb-20 pt-2">
      
      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="p-4 space-y-4">
           {/* Date Filter */}
           <div className="mb-6 p-4 rounded-lg bg-black border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                 <label className="text-gray-400 font-bold whitespace-nowrap">{t('date')}:</label>
                 <div className="flex gap-2 w-full">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500" 
                    />
                    <span className="self-center text-gray-500 font-bold">-</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500" 
                    />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
             <Card className="!mb-0 bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-oja-warning">
                <div className="text-gray-400 text-xs uppercase">{t('totalWork')}</div>
                <div className="text-xl font-bold text-oja-warning">{formatCurrency(totalWork)}</div>
             </Card>
             <Card className="!mb-0 bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-oja-success">
                <div className="text-gray-400 text-xs uppercase">{t('received')}</div>
                <div className="text-xl font-bold text-oja-success">{formatCurrency(totalReceived)}</div>
             </Card>
             <Card className="!mb-0 bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-oja-red">
                <div className="text-gray-400 text-xs uppercase">{t('totalExpense')}</div>
                <div className="text-xl font-bold text-red-400">{formatCurrency(totalExpenses)}</div>
             </Card>
             <Card className="!mb-0 bg-gradient-to-br from-gray-800 to-gray-900 border-l-4 border-blue-500">
                <div className="text-gray-400 text-xs uppercase">{t('netProfit')}</div>
                <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-500'}`}>{formatCurrency(netProfit)}</div>
             </Card>
           </div>
           
           {/* Work Pie Chart */}
           <Card title={t('reports') + " (Work Distribution)"}>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={workTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                     {workTypeData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={['#ff3333', '#00e676', '#ffaa00', '#0088fe', '#9c27b0'][index % 5]} />
                     ))}
                   </Pie>
                   <Legend />
                   <Tooltip contentStyle={{ backgroundColor: '#1a0000', border: 'none', color: '#fff' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </Card>

           {/* Monthly Bar Chart (New Feature) */}
           <Card title="मासिक उत्पन्न vs खर्च (Monthly Report)">
               <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="name" stroke="#ccc" fontSize={12} />
                            <YAxis stroke="#ccc" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a0000', border: '1px solid #333' }} />
                            <Legend />
                            <Bar dataKey="income" name="Income (उत्पन्न)" fill="#00e676" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense (खर्च)" fill="#ff3333" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
               </div>
           </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 p-2 flex justify-around backdrop-blur-lg z-50">
        {[
          { id: 'overview', icon: TrendingUp, label: t('dashboard') },
          { id: 'work', icon: FileText, label: t('work') },
          { id: 'expenses', icon: TrendingDown, label: t('expenses') },
          { id: 'farmers', icon: Users, label: t('farmers') },
          { id: 'drivers', icon: Tractor, label: 'Drivers' }, // ADDED Drivers Tab
          { id: 'settings', icon: Settings, label: t('settings') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === tab.id ? 'text-oja-accent' : 'text-gray-500'}`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] mt-1 font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === 'work' && (
          <>
            {/* PENDING APPROVALS */}
            {pendingEntries.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg animate-pulse border border-yellow-500/20">
                   <h3 className="text-yellow-500 font-bold mb-3 flex items-center gap-2">
                     <Clock size={18} /> Approvals Pending ({pendingEntries.length})
                   </h3>
                   {pendingEntries.map(p => (
                      <div key={p.id} className="bg-black/50 p-3 rounded mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                         <div>
                            <div className="text-white font-bold">
                                {p.type === 'WORK' ? `[WORK] ${WORK_TYPE_LABELS[p.workType || ''] || p.workType}` : '[PAYMENT] Online'}
                            </div>
                            <div className="text-sm text-gray-300">Farmer: {users.find(u => u.id === p.userId)?.name}</div>
                            <div className="text-xs text-gray-400">{formatDate(p.timestamp)} | {formatCurrency(p.amount)}</div>
                            <div className="text-[10px] text-yellow-500 mt-1 italic">{p.details}</div>
                         </div>
                         <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                             <button 
                                onClick={() => handleReject(p.id)} 
                                className="flex-1 sm:flex-none bg-red-600/20 border border-red-500 text-red-400 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-900/40"
                             >
                                <XCircle size={14} className="inline mr-1" /> REJECT
                             </button>
                             <button 
                                onClick={() => handleApprove(p.id)} 
                                className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow hover:bg-green-500"
                             >
                                <CheckCircle size={14} className="inline mr-1" /> APPROVE
                             </button>
                         </div>
                      </div>
                   ))}
                </div>
            )}

            <Button onClick={() => setShowAddWork(true)} icon={Plus} className="w-full mb-4">{t('addWork')}</Button>
            {filteredEntries.map(entry => (
              <Card key={entry.id} className="!p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white">
                      {entry.type === 'WORK' ? (WORK_TYPE_LABELS[entry.workType || ''] || entry.workType) : 'पैसे जमा'}
                      <span className="text-gray-400 text-xs ml-2 font-normal">({formatDate(entry.timestamp)})</span>
                    </div>
                    <div className="text-sm text-gray-400">{users.find(u => u.id === entry.userId)?.name}</div>
                    {entry.details && <div className="text-xs text-gray-500">{entry.details}</div>}
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${entry.type === 'WORK' ? 'text-oja-warning' : 'text-oja-success'}`}>
                      {entry.type === 'WORK' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </div>
                    <button onClick={() => { deleteEntry(entry.id); showNotification("Deleted", 'info'); }} className="text-red-500 text-xs mt-1 flex items-center justify-end gap-1">
                      <Trash2 size={12} /> {t('delete')}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}

        {activeTab === 'expenses' && (
          <>
            <Button onClick={() => setShowAddExpense(true)} variant="danger" icon={Plus} className="w-full mb-4">{t('addExpense')}</Button>
            {filteredExpenses.map(exp => (
              <Card key={exp.id} className="!p-3 border-l-2 border-red-500">
                <div className="flex justify-between">
                  <div>
                    <div className="font-bold">{EXPENSE_TYPE_LABELS[exp.type] || exp.type}</div>
                    <div className="text-xs text-gray-400">{formatDate(exp.timestamp)}</div>
                    {exp.type === ExpenseType.DIESEL && <div className="text-xs text-yellow-500">⛽ {exp.litres}L @ {exp.reading} hrs</div>}
                    <div className="text-xs text-gray-500 italic">{exp.details}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-400">{formatCurrency(exp.amount)}</div>
                    <button onClick={() => deleteExpense(exp.id)} className="text-red-500 text-xs mt-1">{t('delete')}</button>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}

        {activeTab === 'farmers' && (
          <>
            <Button onClick={() => setShowAddFarmer(true)} variant="success" icon={Plus} className="w-full mb-4">{t('addFarmer')}</Button>
            {users.filter(u => u.role === UserRole.CLIENT).map(user => {
               const userEntries = entries.filter(e => e.userId === user.id && e.status !== 'PENDING');
               const uWork = userEntries.filter(e => e.type === 'WORK').reduce((a,c) => a + c.amount, 0);
               const uPaid = userEntries.filter(e => e.type === 'PAYMENT').reduce((a,c) => a + c.amount, 0);
               const pending = uWork - uPaid;
               const isAdvance = pending < 0;
               
               const footer = `\n\nOwner: ${settings.ownerName}\nMobile: ${settings.ownerMob}`;
               const message = `नमस्कार ${user.name}, ओजा ट्रॅक्टर कडे तुमची एकूण बाकी ${formatCurrency(pending)} आहे.${footer}`;
               
               return (
                <Card key={user.id}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{user.name}</h3>
                    <div className="flex gap-2">
                       <button onClick={() => openSMS(user.mob, message)} className="p-2 bg-blue-600 rounded-full text-white shadow shadow-blue-900" title="Send SMS">
                         <MessageSquare size={16} /> 
                       </button>
                       <button onClick={() => openWhatsApp(user.mob, message)} className="p-2 bg-green-600 rounded-full text-white shadow shadow-green-900" title="Send WhatsApp">
                         <MessageCircle size={16} />
                       </button>
                       <button onClick={() => generatePDF(user, userEntries, settings)} className="p-2 bg-red-600 rounded-full text-white shadow shadow-red-900" title="Download PDF Bill">
                         <FileText size={16} />
                       </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{user.village} | {user.mob}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-black/30 p-2 rounded">
                    <div>Total Work: <span className="text-white">{formatCurrency(uWork)}</span></div>
                    <div>Paid: <span className="text-green-400">{formatCurrency(uPaid)}</span></div>
                    <div className="col-span-2 border-t border-white/10 pt-1 mt-1 font-bold">
                       {isAdvance ? 
                           <span className="text-green-400">Advance Balance: +{formatCurrency(Math.abs(pending))}</span> 
                           : 
                           <span>{t('pending')}: <span className="text-oja-warning">{formatCurrency(pending)}</span></span>
                       }
                    </div>
                  </div>
                </Card>
               );
            })}
          </>
        )}
        
        {/* ADDED: Drivers Tab */}
        {activeTab === 'drivers' && (
            <>
                <Button onClick={() => setShowAddDriver(true)} variant="secondary" icon={Plus} className="w-full mb-4">Add New Driver</Button>
                {users.filter(u => u.role === UserRole.DRIVER).map(driver => (
                    <Card key={driver.id}>
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="font-bold text-lg">{driver.name}</h3>
                             <span className="bg-gray-700 text-xs px-2 py-1 rounded">Driver</span>
                        </div>
                        <div className="text-sm text-gray-400 mb-3">{driver.mob}</div>
                        <div className="flex gap-2">
                            <Button 
                                variant="danger" 
                                className="flex-1 text-xs py-2"
                                onClick={() => handlePaySalary(driver)}
                            >
                                Pay Salary
                            </Button>
                        </div>
                    </Card>
                ))}
            </>
        )}

        {activeTab === 'settings' && (
           <Card title={t('settings')}>
             <div className="space-y-4">
               {/* Language Toggle */}
               <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg mb-4">
                   <h4 className="text-blue-400 font-bold text-sm mb-2">{t('language')} / भाषा</h4>
                   <div className="flex gap-2">
                       <button 
                           onClick={() => setLocalSettings({...localSettings, language: 'mr'})}
                           className={`flex-1 py-2 rounded ${localSettings.language === 'mr' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                       >
                           मराठी
                       </button>
                       <button 
                           onClick={() => setLocalSettings({...localSettings, language: 'en'})}
                           className={`flex-1 py-2 rounded ${localSettings.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                       >
                           English
                       </button>
                   </div>
               </div>

               {/* Feature 5: Cloud Status UI */}
               <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-950 border border-indigo-500/30 p-4 rounded-xl mb-4 relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2">
                       {/* @ts-ignore */}
                       {window.db ? <Cloud className="text-green-400 animate-pulse" /> : <CloudOff className="text-gray-500" />}
                       <h4 className="text-indigo-300 font-bold text-sm">Cloud Status (Online Sync)</h4>
                   </div>
                   {/* @ts-ignore */}
                   <p className="text-xs text-gray-300 mb-3">{window.db ? "Online: Data is syncing with Firebase." : "Offline: Data saved on this device only."}</p>
                   {/* @ts-ignore */}
                   {!window.db && (
                       <p className="text-[10px] text-gray-500 italic bg-black/30 p-2 rounded">
                           To enable Cloud Sync, please contact developer to add Firebase Keys in config.
                       </p>
                   )}
               </div>

               {/* Backup & Restore (Feature 4 - Data Safety) */}
               <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg mb-4">
                   <h4 className="text-purple-400 font-bold text-sm mb-2">Data Safety (डेटा सुरक्षितता)</h4>
                   <p className="text-xs text-gray-400 mb-2">महत्वाचे: तुमचा डेटा ब्राउझरमध्ये राहतो. सुरक्षिततेसाठी बॅकअप डाऊनलोड करा.</p>
                   <div className="flex flex-col gap-2">
                       <Button onClick={exportData} variant="secondary" icon={Download} className="w-full text-sm">
                           {t('backupData')}
                       </Button>
                       <div className="relative">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Button variant="ghost" icon={Upload} className="w-full border-dashed border-gray-600 text-sm">
                                {backupFile ? backupFile.name : t('restoreData')}
                            </Button>
                       </div>
                       {backupFile && (
                           <Button onClick={handleRestore} variant="success" className="w-full text-sm py-1">
                               Confirm Restore (Merge Data)
                           </Button>
                       )}
                   </div>
               </div>

               {/* UPI Settings Re-Added */}
               <h4 className="text-oja-accent mt-2 font-bold border-b border-white/10 pb-1">Payment Settings</h4>
               <Input label="UPI ID (For Payments)" value={localSettings.upiId} onChange={e => setLocalSettings({...localSettings, upiId: e.target.value})} placeholder="e.g. oja@upi" />
               <Input label="PhonePe/GPay Number" value={localSettings.upiNo} onChange={e => setLocalSettings({...localSettings, upiNo: e.target.value})} placeholder="e.g. 9999999999" />

               <h4 className="text-oja-accent mt-4 font-bold border-b border-white/10 pb-1">General Settings</h4>
               <Input label="मालकाचे नाव" value={localSettings.ownerName} onChange={e => setLocalSettings({...localSettings, ownerName: e.target.value})} />
               <Input label="मोबाईल" value={localSettings.ownerMob} onChange={e => setLocalSettings({...localSettings, ownerMob: e.target.value})} />
               <Input label="ट्रॅक्टर मॉडेल" value={localSettings.tractorModel} onChange={e => setLocalSettings({...localSettings, tractorModel: e.target.value})} />
               {/* RESTORED: Image URL Input */}
               <Input label="OJA Card Image URL" value={localSettings.tractorImageUrl} onChange={e => setLocalSettings({...localSettings, tractorImageUrl: e.target.value})} placeholder="https://..." />
               
               <h4 className="text-oja-accent mt-4 font-bold border-b border-white/10 pb-1">कामाचे दर (Rates)</h4>
               
               {/* RESTORED: Add Custom Work UI */}
               <div className="bg-white/5 p-3 rounded mb-2 border border-white/10">
                   <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">नवीन काम जोडा (Add Custom Work)</div>
                   <div className="flex gap-2">
                       <Input placeholder="कामाचे नाव (Name)" value={customWork.name} onChange={e => setCustomWork({...customWork, name: e.target.value})} className="mb-0" />
                       <Input placeholder="दर (Rate)" type="number" value={customWork.rate} onChange={e => setCustomWork({...customWork, rate: e.target.value})} className="mb-0" />
                   </div>
                   <Button onClick={addCustomWorkType} variant="secondary" className="w-full mt-2 py-2 text-sm">Add New Rate</Button>
               </div>

               {Object.keys(localSettings.rates).map(key => (
                 <div key={key} className="flex gap-2 items-center mb-2">
                   <div className="w-1/2 flex items-center justify-between">
                       <span className="text-xs text-gray-400 truncate">{WORK_TYPE_LABELS[key] || key}</span>
                       <button onClick={() => removeWorkType(key)} className="text-red-500 hover:text-red-400 px-2">
                           <Trash2 size={12} />
                       </button>
                   </div>
                   <Input 
                      type="number" 
                      value={localSettings.rates[key]} 
                      onChange={e => setLocalSettings({
                        ...localSettings, 
                        rates: { ...localSettings.rates, [key]: parseFloat(e.target.value) } 
                      })} 
                      className="mb-0"
                   />
                 </div>
               ))}
               <Button onClick={saveSettings} className="w-full mt-4">{t('save')}</Button>
             </div>
           </Card>
        )}
      </div>

      {/* MODALS */}
      <Modal isOpen={showAddWork} onClose={() => setShowAddWork(false)} title={t('addWork')}>
        <div className="space-y-3">
          <Input 
            label="शेतकरी निवडा" 
            options={[{label: 'Select...', value: ''}, ...users.filter(u => u.role === UserRole.CLIENT).map(u => ({ label: u.name, value: u.id }))]}
            value={newWork.userId || ''}
            onChange={e => setNewWork({ ...newWork, userId: e.target.value })}
          />
          <Input 
            label="Type" 
            options={[{label: 'Work', value: 'WORK'}, {label: 'Payment', value: 'PAYMENT'}]}
            value={newWork.type}
            onChange={e => setNewWork({ ...newWork, type: e.target.value as any })}
          />
          <Input label="Date" type="date" value={newWork.date} onChange={e => setNewWork({...newWork, date: e.target.value})} />
          
          {newWork.type === 'WORK' && (
            <>
              <Input 
                 label="Work Type"
                 options={[{label: 'Select...', value: ''}, ...Object.keys(settings.rates).map(k => ({ label: WORK_TYPE_LABELS[k] || k, value: k }))]}
                 value={newWork.workType || ''}
                 onChange={e => {
                   const type = e.target.value;
                   setNewWork({ ...newWork, workType: type, rate: settings.rates[type] || 0, amount: (newWork.quantity || 0) * (settings.rates[type] || 0) });
                 }}
              />
              <Input 
                  label="Qty (Guntha/Trip)" 
                  type="number" 
                  value={newWork.quantity || ''} 
                  onChange={e => {
                    const qty = parseFloat(e.target.value);
                    setNewWork({ ...newWork, quantity: qty, amount: qty * (newWork.rate || 0) });
                  }} 
              />
            </>
          )}
          
          <Input label="Amount" type="number" value={newWork.amount || ''} onChange={e => setNewWork({ ...newWork, amount: parseFloat(e.target.value) })} disabled={newWork.type === 'WORK'} />
          <Button onClick={handleAddWork} className="w-full">{t('save')}</Button>
        </div>
      </Modal>

      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title={t('addExpense')}>
        <div className="space-y-3">
          <Input label="Date" type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
          <Input 
            label="Type"
            options={[{label: 'Select...', value: ''}, ...Object.values(ExpenseType).map(v => ({ label: EXPENSE_TYPE_LABELS[v] || v, value: v }))]}
            value={newExpense.type || ''}
            onChange={e => setNewExpense({...newExpense, type: e.target.value})}
          />
          <Input label="Amount" type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
          <Button onClick={handleAddExpense} variant="danger" className="w-full">{t('save')}</Button>
        </div>
      </Modal>

      <Modal isOpen={showAddFarmer} onClose={() => setShowAddFarmer(false)} title={t('addFarmer')}>
        <div className="space-y-3">
          <Input label="Name" value={newFarmer.name || ''} onChange={e => setNewFarmer({...newFarmer, name: e.target.value})} />
          <Input label="Mobile" value={newFarmer.mob || ''} onChange={e => setNewFarmer({...newFarmer, mob: e.target.value})} />
          <Input 
              label="Village" 
              list="village-options"
              value={newFarmer.village || ''} 
              onChange={e => setNewFarmer({...newFarmer, village: e.target.value})} 
          />
          <datalist id="village-options">{uniqueVillages.map(v => <option key={v} value={v} />)}</datalist>
          <Button onClick={handleAddFarmer} className="w-full">{t('save')}</Button>
        </div>
      </Modal>

      {/* Driver Modal */}
      <Modal isOpen={showAddDriver} onClose={() => setShowAddDriver(false)} title="Add New Driver">
        <div className="space-y-3">
          <Input label="Name" value={newDriver.name || ''} onChange={e => setNewDriver({...newDriver, name: e.target.value})} />
          <Input label="Mobile" value={newDriver.mob || ''} onChange={e => setNewDriver({...newDriver, mob: e.target.value})} />
          <p className="text-xs text-gray-400">Default Password: driver</p>
          <Button onClick={handleAddDriver} className="w-full">{t('save')}</Button>
        </div>
      </Modal>

      {/* Feature 6: SMS Confirmation Modal */}
      <Modal isOpen={smsModal.isOpen} onClose={() => setSmsModal({...smsModal, isOpen: false})} title="Work Added! Send Message?">
          <div className="space-y-4">
              <div className="bg-gray-800 p-3 rounded text-sm text-gray-300 font-mono whitespace-pre-wrap border border-gray-600">
                  {generateMessage()}
              </div>
              <div className="flex gap-2">
                  <Button 
                      onClick={() => { openWhatsApp(smsModal.user?.mob || '', generateMessage()); setSmsModal({...smsModal, isOpen: false}); }} 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                      <MessageCircle size={18} /> WhatsApp
                  </Button>
                  <Button 
                      onClick={() => { openSMS(smsModal.user?.mob || '', generateMessage()); setSmsModal({...smsModal, isOpen: false}); }} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                      <Send size={18} /> SMS
                  </Button>
              </div>
              <Button onClick={() => setSmsModal({...smsModal, isOpen: false})} variant="ghost" className="w-full">
                  Later (Skip)
              </Button>
          </div>
      </Modal>

    </div>
  );
};
