/**
 * Root layout for Next.js test app
 */

export const metadata = {
  title: 'Chutes.ai Provider Test',
  description: 'Testing @chutes-ai/ai-sdk-provider in Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

