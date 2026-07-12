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
}
