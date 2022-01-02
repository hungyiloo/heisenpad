import "./Button.css"

export default function Button(props: { children: React.ReactNode, color: 'amber' | 'rose' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { color, children, className, ...rest } = props
  return <button className={`chunky-button ${color} ${className}`} {...rest}>
    {children}
  </button>
}
