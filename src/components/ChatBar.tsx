import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { Message } from "../App";

interface ChatBarProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string) => void;
}

export function ChatBar({ messages, isLoading, onSend }: ChatBarProps) {
  const [input, setInput] = useState("");
  const [hasFocus, setHasFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const isExpanded = hasFocus || isLoading;
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

  // Collapse when clicking anywhere outside the chat bar
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setHasFocus(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Scroll history to bottom when messages change
  useEffect(() => {
    if (historyRef.current && isExpanded) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, isLoading, isExpanded]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const placeholder =
    messages.length === 0
      ? "Where would you like to go? Ask me anything about cars…"
      : "Ask a follow-up…";

  const hasAboveContent = isExpanded
    ? messages.length > 0 || isLoading
    : !!lastAssistantMessage;

  return (
    <div
      ref={containerRef}
      className={`chat-bar${isExpanded ? " chat-bar--expanded" : ""}`}
    >
      <div className="chat-bar-inner">

        {/* Full history — only when expanded */}
        {isExpanded && (messages.length > 0 || isLoading) && (
          <div className="chat-history" ref={historyRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="assistant-avatar"><span>AI</span></div>
                )}
                <div className="message-bubble">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message chat-message--assistant">
                <div className="assistant-avatar"><span>AI</span></div>
                <div className="message-bubble typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last user message preview — only when collapsed */}
        {!isExpanded && lastAssistantMessage && (
          <div className="chat-last-preview">
            <p className="chat-last-preview-text">{lastAssistantMessage.content}</p>
          </div>
        )}

        {/* Divider between content and input */}
        {hasAboveContent && <div className="chat-divider" />}

        {/* Input — always visible */}
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onFocus={() => setHasFocus(true)}
              placeholder={placeholder}
              className="chat-input"
              rows={1}
              disabled={isLoading}
            />
            <div className="input-actions">
              <span className="hint-text">
                {input.length === 0 ? "↵ to send" : `${input.length} chars`}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="send-button"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4 20-7z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
