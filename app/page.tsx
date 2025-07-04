'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-8 text-center space-y-6">
      <h1 className="text-2xl font-semibold">Welcome to the new App Router</h1>

      <div className="flex justify-center gap-6 text-blue-600 underline">
        <Link href="/cart">Cart</Link>
        <Link href="/login">Login</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/admin">Admin</Link>
      </div>
    </main>
  );
}
