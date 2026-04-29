import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5',
    'font-bold uppercase tracking-tight whitespace-nowrap',
    'border-[2.5px] border-[var(--color-line)]',
    'transition-[transform,box-shadow,background] duration-100',
    'disabled:opacity-40 disabled:pointer-events-none',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-danger)]/40',
    'cursor-pointer select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-white text-[var(--color-fg)]',
          'shadow-[2px_2px_0_0_var(--color-line)]',
          'hover:-translate-x-[1px] hover:-translate-y-[1px]',
          'hover:shadow-[3px_3px_0_0_var(--color-line)]',
          'active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--color-line)]',
        ].join(' '),
        primary: [
          'bg-[var(--color-danger)] text-white border-[var(--color-line)]',
          'shadow-[4px_4px_0_0_var(--color-line)]',
          'hover:-translate-x-[2px] hover:-translate-y-[2px]',
          'hover:shadow-[6px_6px_0_0_var(--color-line)]',
          'hover:bg-[var(--color-danger-deep)]',
          'active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_var(--color-line)]',
        ].join(' '),
        ghost: [
          'border-transparent shadow-none text-[var(--color-fg-soft)] bg-transparent',
          'hover:text-[var(--color-fg)] hover:border-[var(--color-line)] hover:bg-[var(--color-card)]',
        ].join(' '),
        danger: [
          'bg-white text-[var(--color-danger)] border-[var(--color-danger)]',
          'shadow-[2px_2px_0_0_var(--color-danger-deep)]',
          'hover:bg-[var(--color-danger)] hover:text-white',
          'hover:-translate-x-[1px] hover:-translate-y-[1px]',
          'hover:shadow-[3px_3px_0_0_var(--color-danger-deep)]',
        ].join(' '),
        outline: [
          'bg-white text-[var(--color-fg)]',
          'shadow-[2px_2px_0_0_var(--color-line)]',
          'hover:bg-[var(--color-fg)] hover:text-white',
        ].join(' '),
      },
      size: {
        default: 'h-9 px-3 text-[11px]',
        sm: 'h-7 px-2 text-[10px]',
        icon: 'h-9 w-9 p-0 text-[14px]',
        lg: 'h-12 px-7 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
