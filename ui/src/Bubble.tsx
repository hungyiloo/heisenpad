import { useState } from "react";
import "./Bubble.css";

export default function Bubble(props: { position: 'left' | 'right', locked?: boolean, unlocked?: boolean, children?: React.ReactNode, onDelete?: () => void, onResend?: () => void }) {
  const [highlighted, setHighlighted] = useState(false)

  function copyToClipboard() {
    const newClip = props.children?.toString()
    if (!newClip) return
    navigator.clipboard.writeText(newClip)
  }

  function highlight() {
    setHighlighted(true)
    setTimeout(() => setHighlighted(false), 300);
  }

  return <div className={`chat-bubble ${props.locked ? 'locked' : ''} ${highlighted ? 'highlight' : ''} ${props.position}`}>
    <pre className="chat-bubble-content">
      {props.children}
    </pre>
    {(props.locked || props.unlocked) && <svg
      className={`${props.locked ? 'h-8 text-rose-800' : 'h-4 text-amber-500'} self-center ${props.position === 'left' ? 'ml-4' : 'order-first mr-4' }`}
      viewBox="0 0 100 100">
      <use xlinkHref="/key.svg#icon-key" />
    </svg>}
    {!props.locked && <div className="chat-tools">
      <button
        onClick={() => props.onDelete?.()}
        className="text-rose-500 hover:text-rose-300">
        DELETE
      </button>
      <button
        onClick={() => { copyToClipboard(); highlight(); }}
        className="text-cyan-500 hover:text-cyan-300">
        COPY
      </button>
      <button
        onClick={() => { props.onResend?.(); highlight() }}
        className="text-emerald-500 hover:text-emerald-300">
        RESEND
      </button>
    </div>}
    <div className="chat-bubble-arrow"/>
  </div>
}
