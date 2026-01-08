
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const questions = await prisma.question.findMany({
    orderBy: { leetcodeId: 'asc' },
    select: { id: true, leetcodeId: true, title: true, slug: true, difficulty: true }
  });

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #0077b5, #00a0dc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        LinkedIn Interview Prep
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {questions.map(q => (
          <Link href={`/problem/${q.slug}`} key={q.id} style={{ textDecoration: 'none' }}>
            <div style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              background: '#fff',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#555' }}>#{q.leetcodeId}</span>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  backgroundColor: q.difficulty === 'Easy' ? '#e8f5e9' : q.difficulty === 'Medium' ? '#fff3e0' : '#ffebee',
                  color: q.difficulty === 'Easy' ? '#2e7d32' : q.difficulty === 'Medium' ? '#e65100' : '#c62828'
                }}>
                  {q.difficulty}
                </span>
              </div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#333' }}>{q.title}</h2>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
