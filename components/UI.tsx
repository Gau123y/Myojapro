import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', action }) => (
  <div className={`bg-oja-card backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl mb-4 ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        {title && <h3 className="text-sm uppercase tracking-widest text-gray-400 font-semibold">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="text-white">{children}</div>
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'ghost' | 'danger';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon: Icon, isLoading, className = '', ...props }) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-red-700 to-red-900 text-white shadow-lg shadow-red-900/40 hover:from-red-600 hover:to-red-800",
    secondary: "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700",
    success: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-900/40",
    danger: "bg-red-950/50 text-red-400 border border-red-900 hover:bg-red-900/50",
    ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {isLoading ? <span className="animate-spin">⌛</span> : Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  label?: string;
  type?: string;
  options?: { label: string; value: string | number }[];
}

export const Input: React.FC<InputProps> = ({ label, className = '', options, ...props }) => {
  const baseStyles = "w-full bg-black/40 border border-gray-700 text-white p-3 rounded-lg focus:border-oja-accent focus:bg-black/60 focus:ring-1 focus:ring-oja-accent transition-all";
  
  return (
    <div className={`mb-3 ${className}`}>
      {label && <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wide">{label}</label>}
      {options ? (
        // @ts-ignore
        <select className={baseStyles} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input className={baseStyles} {...props} />
      )}
    </div>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
