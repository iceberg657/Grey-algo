import { useAuthContext } from '../components/contexts/AuthContext';

export const useAuth = () => {
    return useAuthContext();
};
