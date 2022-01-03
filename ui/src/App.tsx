import { nanoid } from 'nanoid';
import React, { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import Bubble from './Bubble';
import Button from './Button';
import { TextArea } from './Input';
import { welcomeMessage } from './welcome';
import 'react-responsive-modal/styles.css';
import StringCrypto from 'string-crypto';
import { ChannelSwitcher } from './ChannelSwitcher';
import { KeyManager } from './KeyManager';

function App() {
  return <Routes>
    <Route path="/p/:channel" element={<Chat />} />
    <Route path="*" element={<Chat />} />
  </Routes>
}

function Chat() {
  const { channel: routeChannel } = useParams<{ channel: string }>()
  const channel = encodeURIComponent(routeChannel ?? "lobby")
  const myUserId = useMemo(() => nanoid(), [])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [chat, setChat] = useState<Message[]>([]);
  const [secretKey, setSecretKey] = useState("");

  const base = process.env.REACT_APP_WS_URL === '/'
    ? document.location.origin.replace("https:", "wss:").replace("http:", "ws:")
    : process.env.REACT_APP_WS_URL;

  const { sendMessage, lastMessage } = useWebSocket(`${base}/ws/${channel}`);

  useEffect(() => {
    // When we receive a websocket message, process it
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

    // Keep scrolling to the latest message if we were scrolled to the end
    if (!scrollerRef.current) return
    const atBottom = scrollerRef.current.scrollTop + scrollerRef.current.offsetHeight >= scrollerRef.current.scrollHeight
    if (atBottom) {
      setTimeout(() => {
        if (!scrollerRef.current) return
        scrollerRef.current.scrollTo({ behavior: 'smooth', top: scrollerRef.current.scrollHeight });
      })
    }
  }, [scrollerRef, lastMessage])

  useEffect(() => {
    // On first visit or on channel change, display the welcome message
    setChat([{
      id: nanoid(),
      user: nanoid(),
      content: welcomeMessage(channel)
    }])
  }, [channel])

  const [encryptor, decryptor] = useMemo(() => {
    if (!secretKey) return [undefined, undefined]
    const { encryptString, decryptString } = new StringCrypto({ salt: channel + "OZte5GiFetRlkKAt0UkS" })
    return [
      (s: string) => encryptString(s, secretKey),
      (s: string) => decryptString(s, secretKey)
    ]
  }, [secretKey, channel])

  function send(cmd: Command) { sendMessage(JSON.stringify(cmd)); }

  function put(draft: string) {
    send({
      command: "put",
      message: {
        id: nanoid(),
        user: myUserId,
        content: encryptor ? encryptor(draft.trim()) : draft.trim(),
        encrypted: !!encryptor
      }
    });
  }

  return <div className="flex justify-center">
    <div className="container flex flex-col h-screen px-2">
      <div className="flex flex-wrap items-center content-center pt-6 pb-0 px-2 border-b-4 border-zinc-800">
        <svg
          className={`h-7 mr-2 -mt-2 mb-3`}
          viewBox="0 0 100 100">
          <use xlinkHref="/heisenpad.svg#icon-logo" />
        </svg>
        <div className="text-lg tracking-wider font-display text-zinc-100 mr-4 mb-4">
          HEISENPAD
        </div>
        <ChannelSwitcher channel={channel} />
        <div className="ml-auto">
          <KeyManager secretKey={secretKey} onChange={setSecretKey} />
        </div>
      </div>
      <div ref={scrollerRef} className="flex-grow overflow-auto px-4 py-2">
        {chat.map(msg => <React.Fragment key={msg.id}>
          {msg.encrypted
            ? <React.Fragment>
              {decryptor
                ? <Bubble
                  unlocked
                  position={msg.user === myUserId ? 'right' : 'left'}
                  onResend={() => send({ command: "put", message: msg })}
                  onDelete={() => send({ command: "delete", id: msg.id })}>
                  {decryptor(msg.content)}
                </Bubble>
                : <Bubble locked position={msg.user === myUserId ? 'right' : 'left'}>
                  <span className="font-display text-sm">
                    ENCRYPTED &mdash; SET A KEY
                  </span>
                </Bubble>}
            </React.Fragment>
            : <Bubble
              position={msg.user === myUserId ? 'right' : 'left'}
              onResend={() => send({ command: "put", message: msg })}
              onDelete={() => send({ command: "delete", id: msg.id })}>
              {msg.content}
            </Bubble>}
        </React.Fragment>)}
      </div>
      <Editor onDone={put} />
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
        ? <div className="text-sm font-mono text-cyan-500 mb-3 hidden sm:block">
          Multi&ndash;line mode activated. Press <KeyboardShortcut>CTRL+⏎</KeyboardShortcut> or click <KeyboardShortcut>SEND</KeyboardShortcut> when you&rsquo;re done.
        </div>
        : <div className="text-sm font-mono text-zinc-500 mb-3 hidden sm:block">
          Press <span className="border border-zinc-700 px-1 bg-zinc-800 text-zinc-400">Shift+⏎</span> to activate multi&ndash;line mode
        </div>}
      <TextArea
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
