import { useQuery } from "@tanstack/react-query";
import type { User } from "@/types/user";

export function useUser() {
  return useQuery<User | null>({
    queryKey: ['/api/user'],
  });
}
