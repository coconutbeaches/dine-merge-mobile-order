'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const stayId = params.get('stay_id');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!stayId || !firstName) return;
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const authUserId = authData.user?.id;
      if (!authUserId) throw new Error('Failed to authenticate guest user.');

      const { error: insertError } = await supabase
        .from('guest_users')
        .insert({
          auth_user_id: authUserId,
          user_id: `${stayId.toLowerCase()}_${firstName.toLowerCase()}`,
          first_name: firstName,
          stay_id: stayId,
        });
      if (insertError) throw insertError;

      localStorage.setItem('user_id', authUserId);
      router.push('/menu');
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const roomLabel = stayId ? `Room ${stayId.toUpperCase()}` : 'Room';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Welcome to {roomLabel} 🍹
        </h1>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register & View Menu'}
        </button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>}>
      <RegisterForm />
    </Suspense>
  );
}
