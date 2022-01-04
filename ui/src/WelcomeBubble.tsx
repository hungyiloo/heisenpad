import React, { useState } from "react"
import { Modal } from "react-responsive-modal"
import Bubble from "./Bubble"

export default function WelcomeBubble(props: { channel: string }) {
  const { channel } = props
  const [helpModalOpen, setHelpModalOpen] = useState(false)

  return <React.Fragment>
    <Bubble position="left">
      Welcome to heisenpad: the E2E encrypted, transient, anonymous messenger.
      <br/>
      You're in the @<b className="text-amber-600">{channel}</b> channel.
      <br/><br/>
      <button
        onClick={() => setHelpModalOpen(true)}
        className="text-cyan-600 cursor-pointer hover:text-cyan-500 underline outline-none">
        What is this, exactly?
      </button>
    </Bubble>
    <Modal
      open={helpModalOpen}
      onClose={() => setHelpModalOpen(false)}
      closeIcon={<svg
        className="h-5"
        viewBox="0 0 100 100">
        <use xlinkHref="/x.svg#icon-x" />
      </svg>}>
      <div className="font-mono text-zinc-300">
        Hi there! Need to send secure and temporary messages to someone? <span className="font-display text-xs uppercase">Heisenpad</span> can help.
        <br/><br/>
        Type or paste something in the text box at the bottom and click <b className="text-zinc-900 px-1 rounded-sm bg-amber-500">send</b> to broadcast a transient message to <span className="text-amber-500">people only in the @<b>{channel}</b> channel</span>. You can <span className="text-amber-500">change channels</span> by clicking the channel name at the top.
        <br/><br/>
        Messages only "exist" between senders & receivers. There is <span className="text-purple-500">no server logging or persisting</span>. Delete a message and it's gone forever. <span className="text-purple-500">Once everyone leaves the channel, all messages vanish</span> as if they were never there.
        <br/><br/>
        Activate end-to-end encryption by <b className="bg-emerald-500 rounded-sm px-1 text-black text-opacity-90">setting a key</b> at the top right of the screen. Any <span className="text-emerald-500">listeners will need the same key</span> to read your encrypted messages.
      </div>
      <div className="flex items-center justify-center mt-12">
        <button
          className="text-xs font-display text-emerald-500 hover:text-emerald-300 leading-6"
          onClick={() => setHelpModalOpen(false)}>
          OK, I'M READY FOR TOP SNEAKY
        </button>
      </div>
    </Modal>
  </React.Fragment>
}
