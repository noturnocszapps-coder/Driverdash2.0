import React from 'react';
import { cn } from '../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  key?: string | number;
}

export const Card = ({ children, className, ...props }: CardProps) => (
  <div 
    className={cn("bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden", className)} 
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className }: CardProps) => (
  <div className={cn("p-4 border-bottom border-zinc-100 dark:border-zinc-800", className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: CardProps) => (
  <div className={cn("p-4", className)}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  className, 
  variant = 'primary',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-emerald-500 dark:hover:bg-emerald-600',
    outline: 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ className, value, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      "w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all",
      className
    )}
    value={value === null ? '' : value}
    {...props}
  />
);

export const Select = ({ className, children, value, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    className={cn(
      "w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none",
      className
    )}
    value={value === null ? '' : value}
    {...props}
  >
    {children}
  </select>
);
