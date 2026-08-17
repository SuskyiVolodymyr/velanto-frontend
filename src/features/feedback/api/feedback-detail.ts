import { feedbackClient } from "@/api/feedback-client";
import type { Feedback } from "@/types/feedback";

/** Fetch function (no React) for a single feedback post. */
export function getFeedback(id: string): Promise<Feedback> {
  return feedbackClient.getById(id);
}
