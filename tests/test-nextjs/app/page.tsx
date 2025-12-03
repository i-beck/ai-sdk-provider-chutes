/**
 * Simple Next.js page for testing Chutes.ai provider
 * This is a minimal page to verify the app runs
 */

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🧪 Chutes.ai Provider Test</h1>
      <p>This is a minimal Next.js app to test @chutes-ai/ai-sdk-provider</p>
      <p>
        <strong>Test API route:</strong> POST to <code>/api/chat</code>
      </p>
      <pre style={{ 
        background: '#f4f4f4', 
        padding: '1rem', 
        borderRadius: '4px',
        overflow: 'auto'
      }}>
{`curl -X POST http://localhost:3000/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'`}
      </pre>
      <p style={{ color: '#666', fontSize: '0.9em' }}>
        Or run: <code>npm test</code> to test the API route automatically
      </p>
    </main>
  );
}

