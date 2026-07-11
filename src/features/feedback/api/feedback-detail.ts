import { feedbackClient } from "@/src/shared/lib/feedback-client";
import type { Feedback } from "@/src/shared/types/feedback";

/** Fetch function (no React) for a single feedback post. */
export function getFeedback(id: string): Promise<Feedback> {
  return feedbackClient.getById(id);
}
