import React from 'react';
import { cn } from '../utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
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
  size = 'md',
  as: Component = 'button',
  loading = false,
  disabled,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  as?: any;
  loading?: boolean;
}) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-emerald-500 dark:hover:bg-emerald-600',
    outline: 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2',
  };

  return (
    <Component 
      className={cn(
        "rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        loading && "cursor-not-allowed opacity-70",
        variants[variant],
        sizes[size as keyof typeof sizes],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </Component>
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
