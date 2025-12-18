// src/content/components/SidePanel/SummaryView.tsx
import React, { useRef, useEffect, useState } from 'react';
import styles from './SummaryView.module.css';

export interface SummaryViewProps {
  /** Chat messages */
  messages?: string[];
  /** On send message */
  onSendMessage?: (message: string) => void;
  /** On voice record */
  onVoiceRecord?: () => void;
  /** On clear chat */
  onClearChat?: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  messages = [],
  onSendMessage,
  onVoiceRecord,
  onClearChat,
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.summaryView}>
      {/* Chat Messages Container */}
      <div className={styles.chatContainer} ref={chatContainerRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Start a conversation to summarize this page</p>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((message, index) => (
              <div key={index} className={styles.message}>
                {message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className={styles.inputBar}>
        <input
          type="text"
          className={styles.input}
          placeholder="Ask AI anything about the page"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <div className={styles.inputActions}>
          {/* Voice Recording Icon */}
          <button
            className={styles.iconButton}
            onClick={onVoiceRecord}
            aria-label="Voice recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Enter/Send Icon */}
          <button
            className={styles.iconButton}
            onClick={handleSend}
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

          {/* Delete/Clear Icon */}
          <button
            className={styles.iconButton}
            onClick={onClearChat}
            aria-label="Clear chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

SummaryView.displayName = 'SummaryView';
