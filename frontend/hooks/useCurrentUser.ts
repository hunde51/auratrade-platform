"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "@/services/auth";

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    enabled,
    retry: false,
  });
}
