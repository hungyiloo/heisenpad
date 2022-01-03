import { nanoid } from 'nanoid';
import React, { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { Modal } from 'react-responsive-modal';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import Bubble from './Bubble';
import Button from './Button';
import { Input, TextArea } from './Input';
import { welcomeMessage } from './welcome';
import 'react-responsive-modal/styles.css';
import StringCrypto from 'string-crypto';

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
      <div className="flex items-center pt-6 pb-4 px-2 border-b-4 border-zinc-800">
        <svg
          className={`h-7 mr-2 -mt-2 -mb-1`}
          viewBox="0 0 100 100">
          <use xlinkHref="/heisenpad.svg#icon-logo" />
        </svg>
        <div className="text-lg tracking-wider font-display text-zinc-100">
          HEISENPAD
        </div>
        <ChannelSwitcher channel={channel} />
        <div className="ml-auto">
          <Key secretKey={secretKey} onChange={setSecretKey} />
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
        ? <div className="text-sm font-mono text-cyan-500 mb-3">
          Multi&ndash;line mode activated. Press <KeyboardShortcut>CTRL+⏎</KeyboardShortcut> or click <KeyboardShortcut>SEND</KeyboardShortcut> when you&rsquo;re done.
        </div>
        : <div className="text-sm font-mono text-zinc-500 mb-3">
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

function Key(props: { secretKey: string, onChange: (newKey: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draftKey, setDraftKey] = useState("")
  const active = !!props.secretKey;
  return <React.Fragment>
    <div
      className="flex items-center cursor-pointer opacity-90 hover:opacity-100"
      onClick={() => setEditing(true)}>
      <svg
        className={`h-5 retro-box mr-4 ${active ? 'text-zinc-900 bg-emerald-500 emerald' : 'text-rose-400 bg-rose-900 rose-900 animate-pulse'}`}
        viewBox="0 0 100 100">
        <use xlinkHref="/key.svg#icon-key" />
      </svg>
      {active
        ? <span className="font-display text-sm text-emerald-500 mt-1">SECURED</span>
        : <span className="font-display text-sm text-rose-700 mt-1">SET<span className="ml-2">KEY</span></span>}
    </div>
    <Modal
      open={editing}
      onClose={() => setEditing(false)}
      closeIcon={<svg
        className={`h-5 `}
        viewBox="0 0 100 100">
        <use xlinkHref="/x.svg#icon-x" />
      </svg>}>
      <div className="flex flex-col">
        <div className="mb-2 text-lg">Set a strong key</div>
        <div className="mb-8 text-sm text-zinc-500">and <span className="text-zinc-200">securely</span> share to your listeners</div>
        <Input
          type="password"
          value={draftKey}
          onChange={e => setDraftKey(e.target.value)}
          onKeyPress={e => {
            if (e.code === 'Enter') {
              e.preventDefault()
              props.onChange(draftKey)
              setEditing(false)
            }
          }}
          placeholder="e.g. correct horse battery staple"
          className="text-sm"
          style={{ width: '30rem' }}/>
        <div className="flex items-center mt-12">
          <button
            className="font-display text-rose-500 hover:text-rose-300"
            onClick={() => {
              setDraftKey("")
              props.onChange("")
              setEditing(false)
            }}>
            CLEAR KEY
          </button>
          <button
            className="ml-auto font-display text-zinc-600 hover:text-zinc-300"
            onClick={() => setEditing(false)}>
            CANCEL
          </button>
          <button
            className="ml-6 font-display text-emerald-500 hover:text-emerald-300"
            onClick={() => {
              props.onChange(draftKey)
              setEditing(false)
            }}>
            DONE
          </button>
        </div>
      </div>
    </Modal>
  </React.Fragment>
}

function ChannelSwitcher(props: { channel: string }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draftChannel, setDraftChannel] = useState(props.channel)

  useEffect(() => {
    setDraftChannel(props.channel)

  }, [props.channel])

  const url = document.location.origin + "/p/" + encodeURIComponent(draftChannel)

  function joinChannel() {
    navigate(`/p/${encodeURIComponent(draftChannel)}`)
    setEditing(false)
  }

  return <React.Fragment>
    <span className="font-display text-zinc-500 ml-4 text-xl">@</span>
    <div
      className="tracking-wider font-display text-amber-500 hover:text-amber-300 cursor-pointer"
      onClick={() => setEditing(true)}>
      {decodeURIComponent(props.channel)}
    </div>
    <Modal
      open={editing}
      onClose={() => setEditing(false)}
      closeIcon={<svg
        className={`h-5 `}
        viewBox="0 0 100 100">
        <use xlinkHref="/x.svg#icon-x" />
      </svg>}>
      <div className="flex flex-col">
        <div className="mb-8 text-lg">Join a channel</div>
        <Input
          value={draftChannel}
          onChange={e => setDraftChannel(e.target.value)}
          onKeyPress={e => {
            if (e.code === 'Enter') {
              e.preventDefault()
              joinChannel()
            }
          }}
          placeholder="e.g. lobby"
          className="text-sm"
          style={{ width: '30rem' }}/>
        <div className="mt-8 text-sm font-display">
          <a
            href={url}
            onClick={e => { e.preventDefault(); joinChannel() }}
            className="text-cyan-500 hover:text-cyan-300 underline">
            {url}
          </a>
        </div>
        <div className="flex items-center mt-12">
          <button
            className="font-display text-cyan-500 hover:text-cyan-300"
            onClick={() => {
              navigator.clipboard.writeText(url)
            }}>
            COPY LINK
          </button>
          <button
            className="ml-auto font-display text-zinc-600 hover:text-zinc-300"
            onClick={() => setEditing(false)}>
            CANCEL
          </button>
          <button
            className="ml-6 font-display text-amber-500 hover:text-amber-300"
            onClick={() => {
              joinChannel()
            }}>
            JOIN
          </button>
        </div>
      </div>
    </Modal>
  </React.Fragment>
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
