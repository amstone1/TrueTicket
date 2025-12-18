// Re-export auth hooks from the context
// This file exists for backwards compatibility and cleaner imports

export {
  useAuth,
  useRequireAuth,
  useRequireRole,
  useRequireCreator,
  AuthProvider,
} from '@/contexts/AuthContext';
