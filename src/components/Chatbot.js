'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './Chatbot.module.css';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', parts: [{ text: "Hi there! 👋 Welcome to SocialMedia110. How can I help you today?" }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user', parts: [{ text: text }] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'model', parts: [{ text: data.reply }] }]);
      } else {
        setMessages((prev) => [...prev, { role: 'model', parts: [{ text: "Sorry, I'm having trouble connecting right now." }] }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: "Sorry, something went wrong." }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickReplies = [
    "What services do you offer?",
    "Do you offer video editing?",
    "How can I get a quote?"
  ];

  return (
    <div className={styles.chatbotContainer}>
      {isOpen ? (
        <div className={styles.chatWindow}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.avatar}>SM</div>
              <div>
                <div className={styles.title}>SocialMedia110 Bot</div>
                <div className={styles.status}>Online</div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={toggleChat}>✕</button>
          </div>
          
          <div className={styles.messagesArea}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.modelMsg}`}>
                {msg.parts[0].text}
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.modelMsg} ${styles.typing}`}>
                <div className={styles.dot}></div><div className={styles.dot}></div><div className={styles.dot}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className={styles.quickReplies}>
              {quickReplies.map((reply, idx) => (
                <button key={idx} onClick={() => handleSend(reply)} className={styles.qrBtn}>
                  {reply}
                </button>
              ))}
            </div>
          )}

          <div className={styles.inputArea}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend(input);
                }
              }}
              placeholder="Type your message..."
              className={styles.input}
            />
            <button onClick={() => handleSend(input)} className={styles.sendBtn}>
              Send
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.floatingBtn} onClick={toggleChat}>
          💬 Chat with us
        </button>
      )}
    </div>
  );
}
