
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext'; // Custom Alert Import
import { Card, Button, Input, Modal } from './UI';
import { Entry, WorkType, Expense, ExpenseType } from '../types';
import { formatCurrency, formatDate, WORK_TYPE_LABELS, generateReceiptPDF } from '../utils'; // Import PDF Generator
import { Fuel, Plus, Calendar, MapPin, DollarSign, User, Clock, CheckCircle, Download, FileText } from 'lucide-react';

export const ClientView: React.FC = () => {
  const { currentUser } = useAuth();
  const { getEntriesByMobile, settings, addEntry } = useData();
  const { showNotification } = useNotification(); // Use Custom Notification
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  
  const entries = currentUser ? getEntriesByMobile(currentUser.mob) : [];
  
  // Calculate Balance: Only include COMPLETED payments
  const totalWork = entries.filter(e => e.type === 'WORK').reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaid = entries.filter(e => e.type === 'PAYMENT' && e.status !== 'PENDING' && e.status !== 'REJECTED').reduce((acc, curr) => acc + curr.amount, 0);
  const outstanding = totalWork - totalPaid;
  const isAdvance = outstanding < 0;

  const handlePaymentSubmit = () => {
      if(!payAmount || parseFloat(payAmount) <= 0) return showNotification("कृपया योग्य रक्कम टाका", 'error');
      
      addEntry({
          id: Date.now().toString(),
          timestamp: Date.now(),
          date: new Date().toISOString().split('T')[0],
          type: 'PAYMENT',
          status: 'PENDING', // Important: User payments are pending first
          userId: currentUser?.id || '',
          mob: currentUser?.mob || '',
          amount: parseFloat(payAmount),
          details: 'Online Payment (Pending Approval)'
      });

      setShowPayModal(false);
      setPayAmount('');
      showNotification("तुमची रिक्वेस्ट पाठवली आहे. ॲडमिन ॲप्रूव्हल नंतर बॅलन्स अपडेट होईल.", 'success');
  };

  return (
    <div className="p-4 space-y-5">
      {/* OJA Card Redesigned */}
      <div className="w-full aspect-[1.58/1] rounded-2xl relative overflow-hidden shadow-2xl border border-white/20 group select-none transition-transform active:scale-[0.98]">
         {/* Background Image */}
         <img 
            src={settings.tractorImageUrl} 
            alt="Tractor" 
            className="absolute inset-0 w-full h-full object-cover" 
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x400/330000/FFFFFF/png?text=OJA+TRACTOR'; }}
         />
         {/* Overlay */}
         <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/70 to-red-950/80 mix-blend-multiply"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>

         {/* Content */}
         <div className="relative h-full p-5 flex flex-col justify-between text-white z-10">
            {/* Top */}
            <div className="flex justify-between items-start">
                <div>
                   <h1 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-lg">
                      <span className="text-oja-accent">OJA</span> <span className="text-gray-200">CARD</span>
                   </h1>
                   <div className="text-[10px] text-gray-300 uppercase tracking-[0.2em] font-medium">Priority Member</div>
                </div>
                {/* Simulated Chip */}
                <div className="w-11 h-8 bg-gradient-to-br from-amber-200 to-amber-500 rounded flex items-center justify-center border border-amber-300/40 shadow-lg">
                    <div className="w-8 h-5 border border-amber-800/20 rounded-sm grid grid-cols-2"></div>
                </div>
            </div>

            {/* Middle - Balance */}
            <div className="flex flex-col">
                 <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                    {isAdvance ? 'Advance Balance (जमा शिल्लक)' : 'Current Outstanding (येणे बाकी)'}
                 </span>
                 <span className={`text-3xl font-mono font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isAdvance ? 'text-green-400' : 'text-oja-accent'}`}>
                    {isAdvance ? '+' : ''}{formatCurrency(Math.abs(outstanding))}
                 </span>
            </div>

            {/* Bottom - Info */}
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">OWNER</div>
                  <div className="text-sm font-bold tracking-wide uppercase">{settings.ownerName}</div>
                  <div className="text-xs font-mono text-gray-300 tracking-wider">{settings.ownerMob}</div>
               </div>
               <div className="text-right">
                  <div className="text-[9px] text-gray-500 uppercase font-bold mb-0.5">VEHICLE</div>
                  <div className="text-sm font-bold text-oja-warning uppercase">{settings.tractorModel}</div>
               </div>
            </div>
         </div>
      </div>
      
      {/* PAY NOW BUTTON (Only show if there is debt) */}
      {!isAdvance && (
          <Button 
            onClick={() => setShowPayModal(true)} 
            variant="success" 
            className="w-full shadow-lg shadow-green-900/50 py-4 text-lg"
          >
            <DollarSign size={20} /> PAY NOW (ऑनलाईन भरा)
          </Button>
      )}

      {/* Farmer Info Box (Requested) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
         <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">ACCOUNT HOLDER (शेतकरी)</div>
            <div className="text-lg font-bold text-white leading-none mb-1">{currentUser?.name}</div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
               <MapPin size={10} />
               {currentUser?.village || 'Unknown Village'} | {currentUser?.mob}
            </div>
         </div>
         <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center text-white font-bold shadow-inner">
            <User size={20} />
         </div>
      </div>

      <div className="mt-2">
        <h3 className="text-lg font-bold mb-3 text-white border-l-4 border-oja-accent pl-3 flex items-center gap-2">
            अलीकडील व्यवहार (Activity)
        </h3>
        {entries.length === 0 ? <div className="text-gray-500 text-center py-10 bg-white/5 rounded-xl border border-white/5">काहीही नोंद नाही</div> : 
          entries.map(e => (
            <Card key={e.id} className={`!p-3 !mb-2 ${e.status === 'PENDING' ? 'border-yellow-500/50 bg-yellow-900/10' : ''} ${e.status === 'REJECTED' ? 'opacity-50 border-red-900' : ''}`}>
              <div className="flex justify-between items-center">
                 <div>
                    <div className="font-bold text-white flex items-center gap-2">
                        {e.type === 'WORK' ? (WORK_TYPE_LABELS[e.workType || ''] || e.workType) : 'पैसे जमा'}
                        {e.status === 'PENDING' && <span className="text-[10px] bg-yellow-600 px-2 rounded-full text-white">Pending Approval</span>}
                        {e.status === 'REJECTED' && <span className="text-[10px] bg-red-600 px-2 rounded-full text-white">Rejected</span>}
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(e.timestamp)} {e.location && `• ${e.location}`}</div>
                 </div>
                 <div className="text-right">
                    <div className={`font-bold ${e.type === 'WORK' ? 'text-red-400' : (e.status === 'PENDING' ? 'text-yellow-500' : 'text-green-400')}`}>
                        {e.type === 'WORK' ? '-' : '+'}{formatCurrency(e.amount)}
                    </div>
                    
                    {/* RECEIPT DOWNLOAD BUTTON FOR APPROVED PAYMENTS */}
                    {e.type === 'PAYMENT' && e.status === 'COMPLETED' && (
                        <button 
                            onClick={() => generateReceiptPDF(e, currentUser!, settings)}
                            className="mt-1 flex items-center gap-1 text-[10px] bg-gray-800 hover:bg-gray-700 text-oja-accent px-2 py-1 rounded border border-gray-600 transition-colors"
                        >
                            <Download size={10} /> पावती (Receipt)
                        </button>
                    )}
                 </div>
              </div>
            </Card>
          ))
        }
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="ऑनलाईन पेमेंट करा">
         <div className="space-y-4">
             <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">UPI ID (Copy & Pay):</p>
                <p className="text-white font-mono font-bold text-lg select-all bg-black/50 p-2 rounded border border-gray-600">{settings.upiId}</p>
                {settings.upiNo && (
                    <>
                        <p className="text-xs text-gray-400 mt-2 mb-1">PhonePe/GPay Number:</p>
                        <p className="text-white font-mono font-bold text-lg select-all bg-black/50 p-2 rounded border border-gray-600">{settings.upiNo}</p>
                    </>
                )}
             </div>
             
             <Input 
                label="रक्कम (Amount)" 
                type="number" 
                placeholder="₹" 
                value={payAmount} 
                onChange={e => setPayAmount(e.target.value)} 
                className="text-xl font-bold"
             />
             <p className="text-xs text-yellow-500">
                टीप: पेमेंट ॲप (PhonePe/GPay) मधून पेमेंट केल्यावर येथे रक्कम टाकून 'Submit' करा. ॲडमिन Approve केल्यानंतर तुमची बाकी कमी होईल.
             </p>
             <Button onClick={handlePaymentSubmit} variant="success" className="w-full">
                Submit Payment Details
             </Button>
         </div>
      </Modal>
    </div>
  );
};

export const DriverView: React.FC = () => {
  const { addEntry, addExpense, settings, users } = useData();
  const { showNotification } = useNotification(); // Use Notification
  const [mode, setMode] = useState<'work' | 'fuel'>('work');
  
  // Forms
  const [work, setWork] = useState({ userId: '', workType: '', quantity: 0, location: '', date: new Date().toISOString().split('T')[0] });
  const [fuel, setFuel] = useState({ litres: 0, reading: 0, amount: 0, date: new Date().toISOString().split('T')[0] });

  const submitWork = () => {
    if (!work.userId || !work.workType) return showNotification("शेतकरी आणि कामाचा प्रकार निवडा", 'error');
    const rate = settings.rates[work.workType] || 0;
    const user = users.find(u => u.id === work.userId);
    
    addEntry({
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: 'WORK',
      status: 'PENDING', // UPDATED: Driver entries are PENDING now
      mob: user?.mob || '',
      userId: work.userId,
      date: work.date,
      workType: work.workType,
      rate: rate,
      quantity: work.quantity,
      amount: rate * work.quantity,
      details: work.location ? `${work.location} (By Driver)` : '(By Driver)'
    });
    showNotification("काम पाठवले (Sent for Approval)!", 'success');
    setWork({ ...work, quantity: 0, location: '' });
  };

  const submitFuel = () => {
    addExpense({
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: ExpenseType.DIESEL,
      amount: fuel.amount,
      date: fuel.date,
      details: 'Added by Driver',
      litres: fuel.litres,
      reading: fuel.reading
    });
    showNotification("डिझेल नोंदणी झाली!", 'success');
    setFuel({ ...fuel, litres: 0, reading: 0, amount: 0 });
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setMode('work')} className={`p-4 rounded-xl flex flex-col items-center gap-2 border ${mode === 'work' ? 'bg-oja-accent border-oja-accent text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
           <Calendar size={24} />
           <span className="font-bold">काम जोडा</span>
        </button>
        <button onClick={() => setMode('fuel')} className={`p-4 rounded-xl flex flex-col items-center gap-2 border ${mode === 'fuel' ? 'bg-yellow-600 border-yellow-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
           <Fuel size={24} />
           <span className="font-bold">डिझेल टाका</span>
        </button>
      </div>

      <Card title={mode === 'work' ? "नवीन काम (New Work)" : "डिझेल एंट्री"}>
        {mode === 'work' ? (
          <div className="space-y-4">
             <Input 
                label="शेतकरी निवडा" 
                options={[{label: 'निवडा...', value: ''}, ...users.filter(u => u.role === 'client').map(u => ({ label: `${u.name} (${u.village || '-'})`, value: u.id }))]} 
                value={work.userId}
                onChange={e => setWork({...work, userId: e.target.value})}
             />
             <Input 
                label="कामाचा प्रकार" 
                options={[{label: 'निवडा...', value: ''}, ...Object.keys(settings.rates).map(k => ({ label: WORK_TYPE_LABELS[k] || k, value: k }))]} 
                value={work.workType}
                onChange={e => setWork({...work, workType: e.target.value})}
             />
             <Input label="तारीख" type="date" value={work.date} onChange={e => setWork({...work, date: e.target.value})} />
             <div className="grid grid-cols-2 gap-3">
               <Input label="प्रमाण (Qty)" type="number" value={work.quantity} onChange={e => setWork({...work, quantity: parseFloat(e.target.value)})} />
               <Input label="दर (Rate)" disabled value={settings.rates[work.workType] || 0} />
             </div>
             <Input label="ठिकाण" value={work.location} onChange={e => setWork({...work, location: e.target.value})} placeholder="शेताचे नाव / गट नं" />
             <Button onClick={submitWork} className="w-full">काम पाठवा (Submit)</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="तारीख" type="date" value={fuel.date} onChange={e => setFuel({...fuel, date: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
               <Input label="लिटर (Litres)" type="number" value={fuel.litres} onChange={e => setFuel({...fuel, litres: parseFloat(e.target.value)})} />
               <Input label="तास रीडिंग (Reading)" type="number" value={fuel.reading} onChange={e => setFuel({...fuel, reading: parseFloat(e.target.value)})} />
            </div>
            <Input label="एकूण रक्कम (Rs)" type="number" value={fuel.amount} onChange={e => setFuel({...fuel, amount: parseFloat(e.target.value)})} />
            <Button onClick={submitFuel} variant="primary" className="w-full bg-yellow-600 hover:bg-yellow-700 border-none">डिझेल नोंदवा (Save)</Button>
          </div>
        )}
      </Card>
    </div>
  );
};
