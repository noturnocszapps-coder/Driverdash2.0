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
    className={cn("bg-white/95 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden transition-all duration-500", className)} 
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
  <div className={cn("p-6", className)}>
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
    primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold',
    outline: 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold',
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
        "rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
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
      "w-full px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium",
      className
    )}
    value={value === null ? '' : value}
    {...props}
  />
);

export const Select = ({ className, children, value, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    className={cn(
      "w-full px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none font-medium",
      className
    )}
    value={value === null ? '' : value}
    {...props}
  >
    {children}
  </select>
);

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = ({ children, className, ...props }: any) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
);
export const DropdownMenuItem = ({ children, className, ...props }: any) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50",
      className
    )}
    {...props}
  >
    {children}
  </DropdownMenuPrimitive.Item>
);

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800", className)} {...props} />
);
