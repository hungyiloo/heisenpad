import React from "react";
import "./Input.css";

export default function Input(props: { block?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, children, ...rest } = props;
  return <textarea className={`retro-input ${className}`} {...rest}>{children}</textarea>
}
