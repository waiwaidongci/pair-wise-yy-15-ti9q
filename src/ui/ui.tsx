import { useEffect } from "react";
import type { ReactNode } from "react";
import type { IssueCode } from "../domain/rules";
import { ISSUE_LABEL } from "../domain/rules";
import type { HealthStatus } from "../domain/types";

type Tone = "gray" | "blue" | "orange" | "red" | "green";

const TONE_CLASS: Record<Tone, string> = {
  gray: "tag-gray",
  blue: "tag-blue",
  orange: "tag-orange",
  red: "tag-red",
  green: "tag-green",
};

export function Tag({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`tag ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function HealthTag({ health }: { health: HealthStatus }) {
  return health === "normal" ? <Tag tone="green">正常</Tag> : <Tag tone="red">健康异常</Tag>;
}

export function IssueTags({ issues }: { issues: IssueCode[] }) {
  if (issues.length === 0) return <Tag tone="green">有效</Tag>;
  return (
    <>
      {issues.map((code) => (
        <Tag key={code} tone={code === "duplicateReport" ? "gray" : "orange"}>
          {ISSUE_LABEL[code]}
        </Tag>
      ))}
    </>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <em className="req">*</em>}
      </span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-mask" onMouseDown={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const inputCls = "ctrl";
export const selectCls = "ctrl";
