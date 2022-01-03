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
    setChat([{
      id: nanoid(),
      user: nanoid(),
      content:
`Hi there! Need to send secure and temporary messages to someone? Heisenpad can help.

Use heisenpad to send short-lived messages to people only in this channel. Messages only exist between senders & receivers. No logging. No persisting. Refresh and they're gone!

You're currently in the [${channel}] channel. You can change channels at the top of your screen.

Activate end-to-end encryption by *setting a key* at the top right of the screen. Any listeners will need the same key to read your encrypted messages.`
    }])
  }, [channel])

  function send(cmd: Command) { sendMessage(JSON.stringify(cmd)); }

  function put(draft: string) {
    send({
      command: "put",
      message: { id: nanoid(), user: myUserId, content: draft.trim() }
    });
  }

  return <div className="flex justify-center">
    <div className="container flex flex-col h-screen px-2">
      <div className="flex items-center pt-6 pb-4 px-2 border-b-4 border-zinc-800">
        <svg
          className={`h-7 mr-2 -mt-2 -mb-1`}
          viewBox="0 0 100 100">
          <use xlinkHref="/heisenpad.svg#icon-logo" />
        </svg>
        <div className="text-lg tracking-wider font-display text-zinc-100">
          HEISENPAD
        </div>
        <span className="font-display text-zinc-500 ml-4 text-xl">@</span>
        <div className="tracking-wider font-display text-amber-500 hover:text-amber-300 cursor-pointer">
          {channel}
        </div>
        <div className="ml-auto">
          <Key active/>
        </div>
      </div>
      <div className="flex-grow overflow-auto px-4 py-2">
        {chat.map(msg => <React.Fragment key={msg.id}>
          <Bubble
            position={msg.user === myUserId ? 'right' : 'left'}
            onResend={() => send({ command: "put", message: msg })}
            onDelete={() => send({ command: "delete", id: msg.id })}>
            {msg.content}
          </Bubble>
        </React.Fragment>)}
      </div>
      <Editor onDone={put}/>
    </div>
  </div>
}

function Editor(props: { onDone: (value: string) => void }) {
  const [draft, setDraft] = useState("");
  const multiline = draft.includes("\n")

  function handleDone() {
    props.onDone(draft)
    setDraft("")
  }

  return <form className="flex-shrink-0 flex items-end pt-4 pb-8 px-4 border-zinc-800" onSubmit={e => { e.preventDefault(); handleDone() }}>
    <div className="flex-grow flex-col items-stretch">
      {multiline
        ? <div className="text-sm font-mono text-cyan-500 mb-3">
          Multi&ndash;line mode activated. Press <KeyboardShortcut>CTRL+⏎</KeyboardShortcut> or click <KeyboardShortcut>SEND</KeyboardShortcut> when you&rsquo;re done.
        </div>
        : <div className="text-sm font-mono text-zinc-500 mb-3">
          Press <span className="border border-zinc-700 px-1 bg-zinc-800 text-zinc-400">Shift+⏎</span> to activate multi&ndash;line mode
        </div>}
      <Input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          // A hack to allow basic tab insertion in text editor
          if (e.code === 'Tab') {
            e.preventDefault();
            const me = (e.target as HTMLTextAreaElement);
            const start = me.selectionStart;
            const end = me.selectionEnd;
            me.value = me.value.substring(0, start) + "\t" + me.value.substring(end);
            me.selectionStart = me.selectionEnd = start + 1;
          }
        }}
        onKeyPress={e => {
          if (e.code === "Enter" && ((!multiline && !e.shiftKey) || e.ctrlKey)) {
            e.preventDefault();
            handleDone()
          }
        }}
        rows={multiline ? 5 : 1}
        placeholder="Type something..."
        className="w-full" />
    </div>
    <Button
      type="submit"
      className="ml-8"
      style={{ marginBottom: 6, height: "3.75rem" }}
      disabled={!draft.trim()}
      color="amber">
      SEND
    </Button>
  </form>
}

function KeyboardShortcut(props: { children: React.ReactNode }) {
  return <span className="border border-cyan-600 px-1 bg-cyan-900 text-cyan-50">{props.children}</span>
}

function Key(props: { active?: boolean }) {
  return <div className="flex items-center">
    <svg
      className={`h-5 retro-box mr-4 ${props.active ? 'text-zinc-900 bg-emerald-500 emerald' : 'text-rose-400 bg-rose-900 rose-900 animate-pulse'}`}
      viewBox="0 0 100 100">
      <use xlinkHref="/key.svg#icon-key" />
    </svg>
    {props.active
      ? <span className="font-display text-sm text-emerald-500 mt-1">Secure</span>
      : <span className="font-display text-sm text-rose-700 mt-1">Unsecure</span>}
  </div>
}

type Command =
  | { command: "put", message: Message }
  | { command: "delete", id: string }

interface Message {
  id: string
  user: string
  content: string
  encrypted?: boolean
}

export default App;
