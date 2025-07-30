import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'border-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground font-medium font-mono text-xl flex w-fit min-w-0 py-1 pl-2 rounded-md border bg-transparent transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 no-spinner focus-visible:ring-0',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-right',
                className
            )}
            {...props}
        />
    )
}

export { Input }
