import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, hint, id, name, className, ...rest }, ref) {
    const inputId = id ?? name;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted"
        >
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-xs border bg-paper-raised px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent ${
            error ? "border-accent" : "border-line"
          } ${className ?? ""}`}
          {...rest}
        />
        {error ? (
          <p className="text-xs text-accent">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);
