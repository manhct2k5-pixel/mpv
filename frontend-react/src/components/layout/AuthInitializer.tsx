import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth.ts';

interface AuthInitializerProps {
  children: React.ReactNode;
}

const AuthInitializer = ({ children }: AuthInitializerProps) => {
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && !token) {
      login(storedToken);
    }
  }, [token, login]);

  return <>{children}</>;
};

export default AuthInitializer;
