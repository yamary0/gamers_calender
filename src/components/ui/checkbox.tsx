"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
      onChange?.(event);
    };

    return (
      <span className="relative inline-flex items-center">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "peer size-4 appearance-none rounded-sm border border-border bg-background transition-all",
            "checked:border-primary checked:bg-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
          onChange={handleChange}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden place-items-center text-[10px] text-primary-foreground peer-checked:grid"
        >
          ✓
        </span>
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";
