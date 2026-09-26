import type { ReactNode } from "react";
import { useLoft } from "../store/LoftContext";

/* ---------------- 徽标 ---------------- */

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: "gray" | "green" | "amber" | "red" | "blue";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* ---------------- 卡片 / 区块标题 ---------------- */

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <div className="heading">
          <div>
            {subtitle && <p className="kicker">{subtitle}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------- 表单字段 ---------------- */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      <input
        type={type}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------------- 按钮 ---------------- */

export function Btn({
  children,
  onClick,
  variant = "default",
  type = "button",
  disabled,
  small,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  small?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant}${small ? " btn-sm" : ""}`}
    >
      {children}
    </button>
  );
}

/* ---------------- 全局提示（报时 / 更正反馈） ---------------- */

export function Toasts() {
  const { notices, dismissNotice } = useLoft();
  return (
    <div className="toasts">
      {notices.map((n) => (
        <div key={n.id} className={`toast toast-${n.kind}`} onClick={() => dismissNotice(n.id)}>
          {n.text}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 空状态 ---------------- */

export function EmptyState({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
