import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-9 px-3 text-[12px] font-bold tracking-tight',
        'bg-white text-[var(--color-fg)]',
        'border-[2.5px] border-[var(--color-line)]',
        'shadow-[2px_2px_0_0_var(--color-line)]',
        'placeholder:text-[var(--color-fg-mute)] placeholder:font-medium placeholder:uppercase placeholder:tracking-wider',
        'focus:outline-none focus:border-[var(--color-danger)] focus:shadow-[2px_2px_0_0_var(--color-danger-deep)]',
        'transition-colors',
        className,
      )}
      {...props}
    />
  );
});

export { Input };
