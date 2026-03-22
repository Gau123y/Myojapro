
export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
  DRIVER = 'driver'
}

export interface User {
  id: string;
  name: string;
  mob: string;
  role: UserRole;
  pass?: string; // For demo simplicity
  village?: string;
}

export enum WorkType {
  ROTAWETER = 'Rotaweter',
  NAGARNI = 'Nagarni',
  SAPATIKARAN = 'Sapatikaran',
  TRANSPORT_MAATI = 'Transport_Maati',
  TRANSPORT_KHAT = 'Transport_Khat',
  OTHER = 'Other'
}

export interface Entry {
  id: string;
  date: string;
  userId: string; // The farmer/client ID
  mob: string;
  type: 'WORK' | 'PAYMENT';
  status?: 'PENDING' | 'COMPLETED' | 'REJECTED'; // New status field
  workType?: WorkType | string;
  rate?: number;
  quantity?: number; // Guntha or Trips
  amount: number;
  details?: string; // Location or Notes
  location?: string;
  timestamp: number;
}

export enum ExpenseType {
  DIESEL = 'Diesel',
  REPAIR = 'Repair',
  SALARY = 'Salary',
  MAINTENANCE = 'Maintenance',
  OTHER = 'Other'
}

export interface Expense {
  id: string;
  date: string;
  type: ExpenseType | string;
  amount: number;
  details: string;
  timestamp: number;
  // Diesel specific
  litres?: number;
  reading?: number;
}

export interface Rates {
  [key: string]: number;
}

export type Language = 'mr' | 'en';

export interface AppSettings {
  ownerName: string;
  ownerMob: string;
  tractorModel: string;
  tractorImageUrl: string;
  upiId: string;
  upiNo: string; // New field for Phone number
  rates: Rates;
  language: Language; // Added Language preference
}

export const DEFAULT_RATES: Rates = {
  [WorkType.ROTAWETER]: 65,
  [WorkType.NAGARNI]: 150,
  [WorkType.SAPATIKARAN]: 50,
  [WorkType.TRANSPORT_MAATI]: 1500,
  [WorkType.TRANSPORT_KHAT]: 800,
};

export const DEFAULT_SETTINGS: AppSettings = {
  ownerName: 'OJA Owner',
  ownerMob: '9999999999',
  tractorModel: 'Mahindra 575 DI',
  tractorImageUrl: 'https://placehold.co/800x400/800000/FFFFFF/png?text=OJA+TRACTOR',
  upiId: 'oja@upi',
  upiNo: '9999999999',
  rates: DEFAULT_RATES,
  language: 'mr' // Default Marathi
};
