
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext'; // Added
import { AdminDashboard } from './components/AdminDashboard';
import { ClientView, DriverView } from './components/ClientDriverViews';
import { Button, Input } from './components/UI';
import { UserRole } from './types';
import { LogOut, Download } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-oja-darker flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-oja-darker to-red-950 opacity-80"></div>
      
      <div className="relative z-10 flex items-center justify-center">
         {/* Spinning O */}
         <div className="text-8xl font-black text-oja-accent animate-[spin_3s_linear_infinite] origin-center">
            O
         </div>
         {/* Static JA */}
         <div className="text-8xl font-black text-oja-accent tracking-tighter">
            JA
         </div>
      </div>
      <p className="relative z-10 text-white mt-4 font-bold tracking-[0.5em] text-sm opacity-70 animate-pulse">LOADING SYSTEM...</p>
    </div>
  );
};

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const [mob, setMob] = useState('');
  const [pass, setPass] = useState('');

  const handleLogin = () => {
    if (!login(mob, pass)) {
      showNotification('मोबाईल नंबर किंवा पासवर्ड चुकीचा आहे', 'error');
    } else {
      showNotification('लॉगिन यशस्वी!', 'success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-oja-darker border-2 border-oja-accent rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-900"></div>
        <div className="text-center mb-8">
           <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
             <span className="text-oja-accent">OJA</span> SYSTEM
           </h1>
           <p className="text-oja-warning text-sm uppercase tracking-widest font-bold">डिजिटल शेती व्यवस्थापन</p>
        </div>
        
        <div className="space-y-4">
          <Input 
             placeholder="मोबाईल नंबर" 
             value={mob} 
             onChange={e => setMob(e.target.value)} 
             className="text-center text-lg" 
             type="tel"
          />
          <Input 
             type="password" 
             placeholder="पासवर्ड" 
             value={pass} 
             onChange={e => setPass(e.target.value)} 
             className="text-center text-lg"
          />
          <Button onClick={handleLogin} className="w-full py-4 text-lg">लॉगिन करा</Button>
        </div>

        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/5 text-center">
           <h4 className="text-oja-warning font-bold text-sm mb-2 border-b border-gray-700 pb-1">शेतकरी सूचना</h4>
           <p className="text-xs text-gray-300 leading-relaxed">
             तुमचा मोबाईल नंबर हाच तुमचा लॉगिन आयडी आहे. 
             <br/>
             पासवर्डसाठी कृपया ॲडमिन (मालकाशी) संपर्क साधा.
           </p>
        </div>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage(); // Use translation
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if(installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-1 font-black text-xl tracking-tighter">
            <span className="text-oja-accent">OJA</span>
            <span className="text-white">SYSTEM</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-[10px] text-gray-400 uppercase">{t('welcome')}</div>
            <div className="text-sm font-bold text-white">{currentUser?.name}</div>
          </div>
          
          {/* Install App Button */}
          {installPrompt && (
            <button 
                onClick={handleInstall} 
                className="p-2 bg-green-600/20 text-green-400 border border-green-600/50 rounded-full animate-pulse hover:bg-green-600 hover:text-white transition-colors" 
                title="Install App"
            >
                <Download size={18} />
            </button>
          )}

          <button onClick={logout} className="p-2 bg-white/10 rounded-full hover:bg-red-900/50 transition-colors text-red-400 border border-white/5" title={t('logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl">
        {currentUser?.role === UserRole.ADMIN && <AdminDashboard />}
        {currentUser?.role === UserRole.CLIENT && <ClientView />}
        {currentUser?.role === UserRole.DRIVER && <DriverView />}
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <LoadingScreen />;

  return isAuthenticated ? <MainLayout /> : <LoginScreen />;
};

export function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <DataProvider>
          <LanguageProvider>
             <AppContent />
          </LanguageProvider>
        </DataProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
