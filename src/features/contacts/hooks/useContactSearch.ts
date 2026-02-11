import { useQuery } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useContactSearch = (query: string) => {
  const token = useAuthStore((state) => state.session?.access_token || '');
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['contact-search', trimmed],
    queryFn: () => apiService.searchContacts(token, trimmed),
    enabled: Boolean(token && trimmed.length >= 2),
    staleTime: 3000,
  });
};
