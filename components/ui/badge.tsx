import { VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { clsx } from 'clsx';

const badgeVariants = cva(
  'inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-fit',
  {
    variants: {
      variant: {
        default: 'text-blue-500 border-transparent bg-blue-100',
        secondary: 'text-zinc-900 border-transparent bg-zinc-200',
        destructive:
          'bg-red-500 hover:bg-red-500/80 border-transparent text-red-100',
        outline: 'text-zinc-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={clsx(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
