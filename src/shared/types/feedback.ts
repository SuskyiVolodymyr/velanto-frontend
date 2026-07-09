// Local re-declaration of the backend feedback API shapes. NOT imported from
// the backend (the repos share no types package).

export const FEEDBACK_TOPICS = ["bug", "feature", "translation", "other"] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export const FEEDBACK_VISIBILITIES = ["everyone", "staff_only"] as const;
export type FeedbackVisibility = (typeof FEEDBACK_VISIBILITIES)[number];

export const FEEDBACK_STATUSES = ["new", "in_progress", "done", "declined"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_SORTS = ["new", "top"] as const;
export type FeedbackSort = (typeof FEEDBACK_SORTS)[number];

export interface Feedback {
  id: string;
  topic: FeedbackTopic;
  title: string;
  body: string;
  visibility: FeedbackVisibility;
  status: FeedbackStatus;
  authorId: string;
  authorUsername: string;
  handledById: string | null;
  locale: string | null;
  translationContext: string | null;
  translationSuggestion: string | null;
  createdAt: string;
  updatedAt: string;
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
  commentCount: number;
}

export interface FeedbackList {
  items: Feedback[];
  total: number;
  page: number;
  limit: number;
}

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

export interface FeedbackCommentList {
  items: FeedbackComment[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFeedbackInput {
  topic: FeedbackTopic;
  title: string;
  body: string;
  visibility: FeedbackVisibility;
  locale?: string;
  translationContext?: string;
  translationSuggestion?: string;
}

export interface ListFeedbackFilters {
  q?: string;
  topic?: FeedbackTopic;
  status?: FeedbackStatus;
  sort?: FeedbackSort;
  page?: number;
  limit?: number;
}

export interface FeedbackVoteResult {
  score: number;
  likes: number;
  dislikes: number;
  myVote: 1 | -1 | null;
}
