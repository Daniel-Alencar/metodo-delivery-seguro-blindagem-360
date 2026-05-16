import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({
  value, onChange, required, autoComplete, placeholder, className,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={
          className ??
          "w-full rounded-md border border-border bg-card/60 px-3 py-2 pr-10 text-sm outline-none focus:border-foreground/40"
        }
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
