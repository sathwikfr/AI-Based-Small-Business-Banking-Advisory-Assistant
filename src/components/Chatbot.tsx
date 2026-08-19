'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Try to get business context if we are on a business detail page
  const params = useParams();
  const businessId = params?.id as string | undefined;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, businessId }),
      });
      const data = await res.json();
      
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I ran into an error.' }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to connect to the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--chart-line)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0)' : 'scale(1)',
        }}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 360,
          height: 500,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          transition: 'opacity 0.2s, transform 0.2s',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-panel-alt)',
          borderBottom: '1px solid var(--border-hair)',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Vantage Copilot</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ask about portfolio or signals</div>
          </div>
          <button onClick={toggleChat} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
              Hello! I'm your AI Copilot. How can I help you today?
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'var(--chart-line)' : 'var(--bg-panel-alt)',
              color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
              padding: '10px 14px',
              borderRadius: 8,
              maxWidth: '85%',
              fontSize: 13,
              lineHeight: 1.5,
              border: m.role === 'assistant' ? '1px solid var(--border-hair)' : 'none',
            }}>
              {m.content}
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-panel-alt)', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
              <div className="spinner" style={{ width: 12, height: 12, borderTopColor: 'var(--text-muted)' }} />
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-hair)' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '10px 16px',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                background: 'var(--chart-line)',
                border: 'none',
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                opacity: input.trim() && !isLoading ? 1 : 0.5,
              }}
            >
              <Send size={16} style={{ marginLeft: -2 }} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
