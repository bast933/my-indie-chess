import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import './ChatPanel.css';

export default function ChatPanel({ messages, onSend, playerColor }) {
    const [input, setInput] = useState('');
    const messagesRef = useRef(null);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            onSend(input);
            setInput('');
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="chat-panel card">
            <div className="card-header">
                <h3 className="card-title">Chat</h3>
            </div>

            <div className="messages-container" ref={messagesRef}>
                {messages.length === 0 ? (
                    <div className="no-messages">No messages yet</div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message ${msg.color === playerColor ? 'own' : 'other'}`}
                        >
                            <div className="message-header">
                                <span className="message-author">{msg.from}</span>
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div className="message-text">{msg.text}</div>
                        </div>
                    ))
                )}
            </div>

            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="input chat-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={200}
                />
                <button type="submit" className="btn btn-primary btn-icon" disabled={!input.trim()}>
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
