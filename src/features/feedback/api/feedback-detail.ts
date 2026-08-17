import { feedbackClient } from "@/shared/lib/feedback-client";
import type { Feedback } from "@/shared/types/feedback";

/** Fetch function (no React) for a single feedback post. */
export function getFeedback(id: string): Promise<Feedback> {
  return feedbackClient.getById(id);
}
