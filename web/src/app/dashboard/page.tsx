
import { getDailyPlan } from '@/lib/study';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const plan = await getDailyPlan(3);

    // Get mastery stats
    const stats = await prisma.conceptMastery.findMany({
        orderBy: { score: 'asc' },
        include: { concept: true }
    });

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Study Dashboard</h1>

            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ borderBottom: '2px solid #0070f3', paddingBottom: '0.5rem' }}>🎯 Today's Plan</h2>
                {plan.length === 0 ? (
                    <p>No questions generated. Try running the ETL or check logs.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                        {plan.map((q: any) => (
                            <Link href={`/problem/${q.slug}`} key={q.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    padding: '1.5rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    transition: 'transform 0.1s',
                                    cursor: 'pointer'
                                }}>
                                    <h3 style={{ margin: 0 }}>{q.title}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <span style={{
                                            background: q.difficulty === 'Easy' ? '#e8f5e9' : q.difficulty === 'Medium' ? '#fff3e0' : '#ffebee',
                                            color: q.difficulty === 'Easy' ? '#2e7d32' : q.difficulty === 'Medium' ? '#e65100' : '#c62828',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem'
                                        }}>{q.difficulty}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h2>🧠 Concept Mastery</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {stats.map(s => (
                        <div key={s.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 'bold' }}>{s.concept.name}</div>
                            <div style={{ width: '100%', background: '#eee', height: '8px', borderRadius: '4px', marginTop: '0.5rem' }}>
                                <div style={{
                                    width: `${s.score}%`,
                                    background: s.score > 80 ? '#28a745' : s.score > 50 ? '#ffc107' : '#dc3545',
                                    height: '100%',
                                    borderRadius: '4px'
                                }} />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.3rem' }}>
                                Score: {s.score} | Review: {s.nextReviewAt ? new Date(s.nextReviewAt).toLocaleDateString() : 'Now'}
                            </div>
                        </div>
                    ))}
                    {stats.length === 0 && <p>No stats yet. Submit some problems!</p>}
                </div>
            </section>
        </div>
    );
}
