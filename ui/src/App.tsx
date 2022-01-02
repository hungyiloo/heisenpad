import { nanoid } from 'nanoid';
import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import Bubble from './Bubble';
import Button from './Button';
import Input from './Input';

function App() {
  return <Routes>
    <Route path="/p/:channel" element={<Chat />} />
    <Route path="*" element={<Chat />} />
  </Routes>
}

function Chat() {
  const { channel: routeChannel } = useParams<{ channel: string }>();
  const channel = encodeURIComponent(routeChannel ?? "lobby");
  const myUserId = useMemo(() => nanoid(), []);

  const [chat, setChat] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const base = process.env.REACT_APP_WS_URL === '/'
    ? document.location.origin.replace("https:", "wss:").replace("http:", "ws:")
    : process.env.REACT_APP_WS_URL;

  const { sendMessage, lastMessage } = useWebSocket(`${base}/ws/${channel}`);

  useEffect(() => {
    if (!lastMessage) return

    const cmd = JSON.parse(lastMessage.data) as Command
    switch (cmd.command) {
      case "put": {
        setChat(previous => {
          if (previous.some(m => m.id === cmd.message.id)) {
            return previous.map(m => m.id === cmd.message.id ? cmd.message : m)
          } else {
            return [...previous, cmd.message]
          }
        })
        break;
      }
      case "delete": {
        setChat(previous => previous.filter(m => m.id !== cmd.id));
        break;
      }
    }
  }, [lastMessage])

  useEffect(() => {
    setChat([])
  }, [channel])

  function send(cmd: Command) {
    sendMessage(JSON.stringify(cmd));
    setDraft("");
  }

  function put() {
    send({
      command: "put",
      message: { id: nanoid(), user: myUserId, content: draft.trim() }
    });
  }

  const multiline = draft.includes("\n")

  return <div className="flex justify-center">
    <div className="container flex flex-col h-screen px-2">
      <div className="flex items-center pt-6 pb-4 px-2 border-b-4 border-zinc-800">
        <div className="text-lg tracking-wider font-display text-zinc-100">
          HEISEN<span className="text-amber-400">PAD</span>
        </div>
        <div className="text-base tracking-wider font-display text-cyan-500 ml-2">
          <span className="text-zinc-700">#</span>
          {channel}
        </div>
      </div>
      <div className="flex-grow overflow-auto px-4 py-2">
        {chat.map(msg => <React.Fragment key={msg.id}>
          <Bubble
            position={msg.user === myUserId ? 'right' : 'left'}
            onDelete={() => send({ command: "delete", id: msg.id })}>
            {msg.content}
          </Bubble>
        </React.Fragment>)}
      </div>
      <form className="flex-shrink-0 flex items-end pt-4 pb-8 px-4 border-zinc-800" onSubmit={e => { e.preventDefault(); put() }}>
        <div className="flex-grow flex-col items-stretch">
          {multiline && <div className="text-sm font-mono text-cyan-500 mb-3">
            Multi&ndash;line mode activated. The <Key>Enter</Key> key will now insert a new line. Press <Key>CTRL+⏎</Key> or click <Key>SEND</Key> when you&rsquo;re done.
          </div>}
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyPress={e => {
              if (e.code === "Enter" && ((!multiline && !e.shiftKey) || e.ctrlKey)) {
                e.preventDefault();
                put();
              }
            }}
            rows={multiline ? 5 : 1}
            placeholder="Type something..."
            className="w-full" />
        </div>
        <Button
          type="submit"
          className="ml-8"
          style={{ marginBottom: 6 }}
          disabled={!draft.trim()}
          color="amber">
          SEND
        </Button>
      </form>
    </div>
  </div>
}

function Key(props: { children: React.ReactNode }) {
  return <span className="border border-cyan-600 px-1 bg-cyan-900 text-cyan-50">{props.children}</span>
}

type Command =
  { command: "put", message: Message } |
  { command: "delete", id: string }

interface Message {
  id: string
  user: string
  content: string
  encrypted?: boolean
}

export default App;
