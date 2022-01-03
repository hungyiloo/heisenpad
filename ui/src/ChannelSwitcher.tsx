import React, { useEffect, useState } from 'react';
import { Modal } from 'react-responsive-modal';
import { useNavigate } from 'react-router-dom';
import { Input } from './Input';

export function ChannelSwitcher(props: { channel: string; }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draftChannel, setDraftChannel] = useState(props.channel);

  useEffect(() => {
    setDraftChannel(props.channel);

  }, [props.channel]);

  const url = document.location.origin + "/p/" + encodeURIComponent(draftChannel);

  function joinChannel() {
    navigate(`/p/${encodeURIComponent(draftChannel)}`);
    setEditing(false);
  }

  return <React.Fragment>
    <div className="flex mb-4">
      <span className="font-display text-zinc-500 text-xl">@</span>
      <div
        className="tracking-wider font-display text-amber-500 hover:text-amber-300 cursor-pointer"
        onClick={() => setEditing(true)}>
        {decodeURIComponent(props.channel)}
      </div>
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
        <div className="mb-8 text-base sm:text-lg">Join a channel</div>
        <Input
          value={draftChannel}
          onChange={e => setDraftChannel(e.target.value)}
          onKeyPress={e => {
            if (e.code === 'Enter') {
              e.preventDefault();
              joinChannel();
            }
          }}
          placeholder="e.g. lobby"
          className="text-sm"
          style={{ width: '30rem', maxWidth: 'calc(100vw - 9rem)' }} />
        <div className="mt-8 text-sm font-display">
          <a
            href={url}
            onClick={e => { e.preventDefault(); joinChannel(); }}
            className="text-cyan-500 hover:text-cyan-300 underline break-all">
            {url}
          </a>
        </div>
        <div className="flex items-center mt-12">
          <button
            className="font-display text-cyan-500 hover:text-cyan-300 mr-4"
            onClick={() => {
              navigator.clipboard.writeText(url);
            }}>
            COPY
          </button>
          <button
            className="ml-auto font-display text-zinc-600 hover:text-zinc-300"
            onClick={() => setEditing(false)}>
            CANCEL
          </button>
          <button
            className="ml-6 font-display text-amber-500 hover:text-amber-300"
            onClick={() => {
              joinChannel();
            }}>
            JOIN
          </button>
        </div>
      </div>
    </Modal>
  </React.Fragment>;
}
