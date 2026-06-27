export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
}

export interface Income {
  fixed: number;
  variable: number;
  extras: number;
  extrasNote?: string;
}

export interface SavingsAllocation {
  id: string;
  name: string;
  amount: number;
  accountId?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
  dueDay?: number; // día del mes en que vence (1-31), opcional
  order: number;
}

export interface MonthData {
  id: string; // "2024-06"
  income: Income;
  savings: SavingsAllocation[];
  fixedExpenses: FixedExpense[];
  createdAt: string;
}

export type PaymentMethod = 'efectivo' | 'yape' | 'tarjeta';

export interface Transaction {
  id: string;
  userId: string;
  monthId: string; // "2024-06"
  date: string; // ISO
  amount: number;
  category: string;
  description: string;
  paymentMethod?: PaymentMethod;
  shared?: boolean;
  reimbursedAmount?: number;
  createdAt: string;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'yape', label: 'Yape' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

export type AccountCurrency = 'PEN' | 'USD';
export type AccountType = 'savings' | 'cts' | 'fund' | 'investment';

export interface Account {
  id: string;
  userId: string;
  name: string;
  currency: AccountCurrency;
  type: AccountType;
  balance: number;
  note?: string;
  order: number;
  createdAt: string;
}

export interface AccountMovement {
  id: string;
  accountId: string;
  userId: string;
  date: string;
  amount: number; // positive = deposit, negative = withdrawal
  description: string;
  createdAt: string;
}

// Categorías sugeridas para precargar la cuenta de un usuario nuevo.
// Cada usuario puede editarlas libremente desde Gastos Variables.
export const DEFAULT_CATEGORIES = [
  'Comida',
  'Pasajes',
  'Taxi',
  'Casa',
  'Salidas / Ocio',
  'Salud',
  'Ropa',
  'Otros',
];

export interface Category {
  id: string;
  name: string;
  order: number;
}
