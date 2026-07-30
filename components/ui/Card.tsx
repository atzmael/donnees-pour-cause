import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  href?: string;
  interactive?: boolean;
};

export function Card({
  children,
  className = "",
  href,
  interactive = false,
  ...props
}: CardProps) {
  const classes = [
    "ui-card",
    interactive ? "ui-card-interactive" : "",
    className,
  ].filter(Boolean).join(" ");

  if (href) {
    return (
      <a className={classes} href={href} {...(props as HTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return <article className={classes} {...props}>{children}</article>;
}
