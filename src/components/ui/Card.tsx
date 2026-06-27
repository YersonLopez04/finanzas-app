interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: Props) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-100 shadow-[0_2px_16px_rgba(41,37,36,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: Props) {
  return <div className={`px-5 py-4 border-b border-stone-100/80 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: Props) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
