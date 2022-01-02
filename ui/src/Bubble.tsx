import { useState } from "react";
import "./Bubble.css";

export default function Bubble(props: { position: 'left' | 'right', children?: React.ReactNode, onDelete?: () => void }) {
  const [highlighted, setHighlighted] = useState(false)

  function copyToClipboard() {
    const newClip = props.children?.toString()
    if (!newClip) return
    navigator.clipboard.writeText(newClip)
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
        className="text-rose-500 hover:text-rose-600 hover:underline">
        DELETE
      </button>
      <button
        onClick={() => copyToClipboard()}
        className="ml-4 text-cyan-500 hover:text-cyan-600 hover:underline">
        COPY
      </button>
    </div>
    <div className="chat-bubble-arrow"/>
  </div>
}
