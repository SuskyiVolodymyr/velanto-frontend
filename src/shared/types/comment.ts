import type { Role } from "@/src/shared/types/user";

export interface Comment {
  id: string;
  packId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  /**
   * Author role + trust flags for the nickname treatment. Optional so existing
   * comment fixtures stay valid; the live backend always sends them.
   */
  authorRole?: Role;
  authorTrusted?: boolean;
  /**
   * Two-level threading: `null`/absent = a root comment, a string = a reply to
   * that root. Roots carry their replies (oldest-first) and a `replyCount`;
   * replies carry `[]` / 0. Optional for the same fixture-compatibility reason
   * as the author flags above — the live backend always sends them.
   */
  parentId?: string | null;
  replyCount?: number;
  replies?: Comment[];
  /**
   * Vote aggregate: net score (likes − dislikes), the raw counts, and the
   * viewer's own vote. Rendered by the VoteControl pill (added with the voting
   * UI). Optional for fixture compatibility.
   */
  score?: number;
  likes?: number;
  dislikes?: number;
  myVote?: 1 | -1 | null;
}
