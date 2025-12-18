'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              ref={ref}
              type="checkbox"
              id={inputId}
              className={cn(
                'peer sr-only',
                className
              )}
              {...props}
            />
            <div
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-indigo-500',
                'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                error
                  ? 'border-red-300 peer-checked:bg-red-600 peer-checked:border-red-600'
                  : 'border-gray-300 peer-checked:bg-indigo-600 peer-checked:border-indigo-600'
              )}
            >
              <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" />
            </div>
          </div>
        </div>
        {(label || description) && (
          <label
            htmlFor={inputId}
            className="ml-3 cursor-pointer"
          >
            {label && (
              <span className="text-sm font-medium text-gray-900">{label}</span>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio button variant
export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const inputId = id || `${props.name}-${props.value}`;

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="radio"
            id={inputId}
            className={cn(
              'w-4 h-4 text-indigo-600 border-gray-300',
              'focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <label htmlFor={inputId} className="ml-3 cursor-pointer">
            {label && (
              <span className="text-sm font-medium text-gray-900">{label}</span>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// Radio group component
export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  className?: string;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  className,
  disabled = false,
}: RadioGroupProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={(e) => onChange?.(e.target.value)}
          label={option.label}
          description={option.description}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
