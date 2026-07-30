import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  selected?: boolean;
};

export function Button({
  children,
  className = "",
  variant = "outline",
  size = "md",
  selected = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "ui-button",
        `ui-button-${variant}`,
        `ui-button-${size}`,
        selected ? "is-selected" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
