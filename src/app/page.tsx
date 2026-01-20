'use client';

import { useAuth } from '@/lib/auth-context';
import DatePointsTracker from '@/components/DatePointsTracker';
import AuthPage from '@/components/AuthPage';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-2xl text-purple-600">A carregar...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DatePointsTracker />;
}
