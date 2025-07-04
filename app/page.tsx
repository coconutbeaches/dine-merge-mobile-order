'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to menu page
    router.push('/menu');
  }, [router]);

  return (
    <main className="p-8 text-center space-y-6">
      <h1 className="text-2xl font-semibold">Redirecting to menu...</h1>
    </main>
  );
}
