'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ChatSidebar from './ChatSidebar';

interface WorkspaceProps {
    question: {
        id: string;
        title: string;
        contentMd: string;
        difficulty: string;
        signatureJson: any;
    };
    referenceSolution?: {
        code: string;
        language: string;
    };
}

export default function Workspace({ question, referenceSolution }: WorkspaceProps) {
    const [code, setCode] = useState(
        question.signatureJson?.python || '# Write your Python code here\nclass Solution:\n    def solve(self):'
    );
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'description' | 'solutions' | 'submissions' | 'ai'>('description');
    const [submissions, setSubmissions] = useState<any[]>([]);

    // Helper to strip frontmatter (flexible for CRLF/LF and spacing) and unwanted text
    const fullContent = question.contentMd
        .replace(/^\s*---[\s\S]*?---\s*/, '')
        .replace(/中文文档/g, '');

    // Split into Description and Solutions
    // Doocs READMEs typically have ## Description ... ## Solutions
    const splitIndex = fullContent.indexOf('## Solutions');
    const descriptionContent = splitIndex !== -1 ? fullContent.substring(0, splitIndex) : fullContent;
    const solutionsContent = splitIndex !== -1 ? fullContent.substring(splitIndex) : null;

    const fetchSubmissions = async () => {
        try {
            const res = await fetch(`/api/submissions?questionId=${question.id}`);
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data);
            }
        } catch (e) {
            console.error('Failed to fetch submissions', e);
        }
    };

    useEffect(() => {
        if (activeTab === 'submissions') {
            fetchSubmissions();
        }
    }, [activeTab]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitResult(null);
        setOutput('Submitting...');
        try {
            const res = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question.id,
                    language,
                    code,
                }),
            });
            const data = await res.json();
            setSubmitResult(data);
            setOutput(JSON.stringify(data, null, 2));
            if (activeTab === 'submissions') fetchSubmissions();
        } catch (e: any) {
            setOutput('Error: ' + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        setSubmitResult(null);
        setOutput('Running...');
        try {
            const res = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question.id,
                    language,
                    code,
                }),
            });
            const data = await res.json();

            // Format output purely for display if it's a simple run result
            if (data.error) {
                setOutput('Error: ' + data.error);
            } else if (Array.isArray(data)) {
                // It's a list of test results
                setOutput(JSON.stringify(data, null, 2));
            } else {
                setOutput(JSON.stringify(data, null, 2));
            }

        } catch (e: any) {
            setOutput('Error: ' + e.message);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh', fontFamily: 'system-ui' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #ddd', background: '#f5f5f5' }}>
                    <button onClick={() => setActiveTab('description')} style={getStatusStyle(activeTab === 'description')}>Description</button>
                    <button onClick={() => setActiveTab('solutions')} style={getStatusStyle(activeTab === 'solutions')}>Solutions</button>
                    <button onClick={() => setActiveTab('submissions')} style={getStatusStyle(activeTab === 'submissions')}>Submissions</button>
                    <button onClick={() => setActiveTab('ai')} style={getStatusStyle(activeTab === 'ai')}>AI Coach</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'description' && (
                        <div style={{ padding: '1rem' }}>
                            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{question.title}</h1>
                            <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                backgroundColor: question.difficulty === 'Easy' ? '#e8f5e9' : question.difficulty === 'Medium' ? '#fff3e0' : '#ffebee',
                                color: question.difficulty === 'Easy' ? '#2e7d32' : question.difficulty === 'Medium' ? '#e65100' : '#c62828'
                            }}>
                                {question.difficulty}
                            </span>
                            <div className="markdown-body" style={{ marginTop: '1rem', lineHeight: '1.6' }} suppressHydrationWarning>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                    components={{
                                        pre: ({ node, ...props }: any) => <div style={{ overflow: 'auto', background: '#f6f8fa', padding: '1rem', borderRadius: '6px' }} {...props} />,
                                        code: ({ node, ...props }: any) => <code style={{ background: 'rgba(175, 184, 193, 0.2)', padding: '0.2em 0.4em', borderRadius: '6px', fontSize: '85%' }} {...props} />
                                    }}
                                >
                                    {descriptionContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                    {activeTab === 'solutions' && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {solutionsContent && (
                                <div style={{ padding: '1rem', borderBottom: '1px solid #eee', maxHeight: '40%', overflowY: 'auto', background: '#f8f9fa' }}>
                                    <div className="markdown-body" style={{ fontSize: '0.9rem' }}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
                                            components={{
                                                pre: ({ node, ...props }: any) => <div style={{ overflow: 'auto', background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #eee' }} {...props} />,
                                                code: ({ node, ...props }: any) => <code style={{ background: 'rgba(175, 184, 193, 0.2)', padding: '0.2em 0.4em', borderRadius: '6px', fontSize: '85%' }} {...props} />
                                            }}
                                        >
                                            {solutionsContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            <div style={{ padding: '0.5rem 1rem', background: '#fff9db', borderBottom: '1px solid #eee', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                🐍 Reference Implementation (Python)
                            </div>
                            <div style={{ flex: 1 }}>
                                {referenceSolution ? (
                                    <Editor
                                        height="100%"
                                        language="python"
                                        value={referenceSolution.code}
                                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
                                    />
                                ) : (
                                    <div style={{ padding: '2rem', color: '#666' }}>No reference solution available.</div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'submissions' && (
                        <div style={{ padding: '1rem' }}>
                            <h3>Submission History</h3>
                            {submissions.length === 0 && <p>No submissions yet.</p>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {submissions.map((sub: any) => (
                                    <div key={sub.id} style={{ padding: '0.8rem', border: '1px solid #eee', borderRadius: '6px', background: sub.status === 'AC' ? '#f0fff4' : '#fff5f5' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ color: sub.status === 'AC' ? '#2e7d32' : '#c62828' }}>
                                                {sub.status === 'AC' ? 'Accepted' : sub.status}
                                            </strong>
                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(sub.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'ai' && (
                        <div style={{ height: '100%' }}>
                            <ChatSidebar context={{ questionId: question.id, userCode: code, language }} />
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #ddd', display: 'flex', gap: '1rem', alignItems: 'center', background: '#f5f5f5' }}>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px' }}>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                    </select>
                    <div style={{ flex: 1 }} />
                    <button onClick={handleRun} disabled={isRunning || isSubmitting} style={actionBtnStyle(isRunning ? '#ccc' : '#0070f3')}>
                        {isRunning ? 'Running...' : 'Run'}
                    </button>
                    <button onClick={handleSubmit} disabled={isRunning || isSubmitting} style={actionBtnStyle(isSubmitting ? '#ccc' : '#28a745')}>
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>

                <div style={{ flex: 1 }}>
                    <Editor height="100%" language={language} value={code} onChange={(val) => setCode(val || '')} options={{ minimap: { enabled: false }, fontSize: 14 }} />
                </div>

                {/* Output Area */}
                <div style={{ height: '35%', borderTop: '1px solid #ddd', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                    <div style={{ padding: '0.5rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#555' }}>
                        Output
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontFamily: 'monospace', fontSize: '13px' }}>
                        {submitResult ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    color: submitResult.status === 'AC' ? '#2e7d32' : '#c62828',
                                    fontSize: '1.2rem', fontWeight: 'bold'
                                }}>
                                    <span>{submitResult.status === 'AC' ? '✅ Accepted' : '❌ ' + submitResult.status}</span>
                                    <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>
                                        ({submitResult.passed} / {submitResult.total} passed)
                                    </span>
                                </div>

                                {submitResult.failedCase && (
                                    <div style={{ background: '#fff5f5', border: '1px solid #ffc9c9', borderRadius: '6px', padding: '1rem' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>Failed Case</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                            <strong>Input:</strong> <code>{submitResult.failedCase.input}</code>
                                            <strong>Expected:</strong> <code>{submitResult.failedCase.expected}</code>
                                            <strong>Actual:</strong> <code>{submitResult.failedCase.actual}</code>
                                        </div>
                                    </div>
                                )}

                                {submitResult.status === 'AC' && (
                                    <div style={{ padding: '0.5rem', background: '#e8f5e9', borderRadius: '4px', color: '#2e7d32' }}>
                                        All known test cases passed!
                                    </div>
                                )}
                            </div>
                        ) : (
                            output ? (
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output}</pre>
                            ) : (
                                <div style={{ color: '#aaa', fontStyle: 'italic' }}>Run or Submit code to see results...</div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStatusStyle(active: boolean) {
    return {
        padding: '0.8rem 1.5rem',
        border: 'none',
        background: active ? 'white' : 'transparent',
        borderBottom: active ? '2px solid #0070f3' : 'none',
        cursor: 'pointer',
        fontWeight: active ? 'bold' : 'normal' as any
    };
}

function actionBtnStyle(color: string) {
    return {
        padding: '0.5rem 1rem',
        background: color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    };
}
