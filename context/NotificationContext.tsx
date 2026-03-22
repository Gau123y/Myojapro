import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-300 max-w-sm w-full
              ${n.type === 'success' ? 'bg-green-900/90 border-green-500 text-white' : ''}
              ${n.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : ''}
              ${n.type === 'info' ? 'bg-blue-900/90 border-blue-500 text-white' : ''}
            `}
          >
            {n.type === 'success' && <CheckCircle size={20} className="text-green-400" />}
            {n.type === 'error' && <AlertCircle size={20} className="text-red-400" />}
            {n.type === 'info' && <Info size={20} className="text-blue-400" />}
            
            <p className="flex-1 text-sm font-medium">{n.message}</p>
            
            <button onClick={() => removeNotification(n.id)} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};