import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!user || !token) {
    return (
      <Navigate
        to="/welcome"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
