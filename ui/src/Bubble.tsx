import { useState } from "react";
import "./Bubble.css";

export default function Bubble(props: { position: 'left' | 'right', children?: React.ReactNode, onDelete?: () => void, onResend?: () => void }) {
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

  return <div className={`chat-bubble ${highlighted ? 'highlight' : ''} ${props.position}`}>
    <pre className="chat-bubble-content">
      {props.children}
    </pre>
    <div className="chat-tools">
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
    </div>
    <div className="chat-bubble-arrow"/>
  </div>
}
