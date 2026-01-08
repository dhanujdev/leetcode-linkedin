
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatSidebarProps {
    context: {
        questionId: string;
        userCode: string;
        language: string;
    };
}

export default function ChatSidebar({ context }: ChatSidebarProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hi! I'm your AI Coach. I can help you debug your code, explain the solution, or give you a hint. What's on your mind?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context
                }),
            });

            if (!res.ok) {
                // Handle non-stream error
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || res.statusText}` }]);
                setIsLoading(false);
                return;
            }

            // Create placeholder for assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            // Read the stream
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("No reader available");
            }

            let accumulatedText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;

                // Update the last message (assistant) with accumulated text
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const last = newMsgs[newMsgs.length - 1];
                    if (last.role === 'assistant') {
                        last.content = accumulatedText;
                    }
                    return newMsgs;
                });
            }

        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8f9fa' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: m.role === 'user' ? '#0070f3' : '#fff',
                        color: m.role === 'user' ? 'white' : 'black',
                        padding: '0.8rem',
                        borderRadius: '12px',
                        borderBottomRightRadius: m.role === 'user' ? '2px' : '12px',
                        borderBottomLeftRadius: m.role === 'assistant' ? '2px' : '12px',
                        border: m.role === 'assistant' ? '1px solid #e9ecef' : 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                        <span className="animate-pulse">Thinking...</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid #ddd', background: '#fff' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '20px', border: '1px solid #ccc', outline: 'none' }}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        style={{
                            background: isLoading ? '#ccc' : '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ➤
                    </button>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                    {['Explain Solution', 'Debug my code', 'Hint'].map(suggestion => (
                        <button
                            key={suggestion}
                            onClick={() => { setInput(suggestion); handleSend(); }} // Auto send? Or just fill? Let's just fill for now to be safe, or direct send? Direct send is better UX.
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '15px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
