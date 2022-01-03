import React, { useState } from 'react';
import { Modal } from 'react-responsive-modal';
import { Input } from './Input';

export function KeyManager(props: { secretKey: string; onChange: (newKey: string) => void; }) {
  const [editing, setEditing] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const active = !!props.secretKey;
  return <React.Fragment>
    <div
      className="flex items-center cursor-pointer opacity-90 hover:opacity-100 mb-4"
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
        <div className="mb-2 text-base sm:text-lg">Set a strong key</div>
        <div className="mb-8 text-sm text-zinc-500">and <span className="text-zinc-200">securely</span> share to your listeners</div>
        <Input
          type="password"
          value={draftKey}
          onChange={e => setDraftKey(e.target.value)}
          onKeyPress={e => {
            if (e.code === 'Enter') {
              e.preventDefault();
              props.onChange(draftKey);
              setEditing(false);
            }
          }}
          placeholder="e.g. correct horse battery staple"
          className="text-sm"
          style={{ width: '30rem', maxWidth: 'calc(100vw - 9rem)' }} />
        <div className="flex items-center mt-12">
          <button
            className="font-display text-rose-500 hover:text-rose-300 mr-4"
            onClick={() => {
              setDraftKey("");
              props.onChange("");
              setEditing(false);
            }}>
            CLEAR
          </button>
          <button
            className="ml-auto font-display text-zinc-600 hover:text-zinc-300"
            onClick={() => setEditing(false)}>
            CANCEL
          </button>
          <button
            className="ml-6 font-display text-emerald-500 hover:text-emerald-300"
            onClick={() => {
              props.onChange(draftKey);
              setEditing(false);
            }}>
            DONE
          </button>
        </div>
      </div>
    </Modal>
  </React.Fragment>;
}
