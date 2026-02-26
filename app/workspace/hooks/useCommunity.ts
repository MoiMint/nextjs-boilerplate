import { useCallback, useState } from "react";
import type { Post } from "../types";

export const useCommunity = (authHeaders: HeadersInit) => {
  const [posts, setPosts] = useState<Post[]>([]);

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/community", { headers: authHeaders });
    const data = (await res.json()) as { posts?: Post[] };
    setPosts(data.posts ?? []);
  }, [authHeaders]);

  return { posts, setPosts, loadPosts, refreshCommunity: loadPosts };
};
