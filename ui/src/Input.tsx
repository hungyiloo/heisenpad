import React from "react";
import "./Input.css";

export function TextArea(props: { block?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, children, ...rest } = props;
  return <textarea className={`retro-input ${className}`} {...rest}>{children}</textarea>
}

export function Input(props: { block?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, children, ...rest } = props;
  return <input className={`retro-input ${className}`} {...rest}>{children}</input>
}
