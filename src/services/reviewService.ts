import { authenticatedFetch } from './apiClient';
import type { Review, ReviewCreateInput } from '../types/review';

const normalizeReview = (item: unknown): Review | null => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;

  const ratings = Array.isArray(candidate.ratings)
    ? candidate.ratings
        .filter((rating): rating is Record<string, unknown> => typeof rating === 'object' && rating !== null)
        .map((rating) => ({
          label: typeof rating.label === 'string' ? rating.label : '',
          score: typeof rating.score === 'number' ? rating.score : Number(rating.score ?? 0)
        }))
        .filter((rating) => rating.label.trim().length > 0 && Number.isFinite(rating.score))
    : [];

  const review: Review = {
    _id: typeof candidate._id === 'string' ? candidate._id : String(candidate._id ?? ''),
    routeId: typeof candidate.routeId === 'string' ? candidate.routeId : String(candidate.routeId ?? ''),
    userId: typeof candidate.userId === 'string' ? candidate.userId : String(candidate.userId ?? ''),
    title: typeof candidate.title === 'string' ? candidate.title : '',
    comment: typeof candidate.comment === 'string' ? candidate.comment : undefined,
    ratings,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined
  };

  if (!review._id || !review.routeId || !review.userId || !review.title) {
    return null;
  }

  return review;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data?.message || data?.error?.details?.[0]?.message || data?.error?.message || 'Review request failed.';
  } catch {
    return 'Review request failed.';
  }
};

export const reviewService = {
  async getReviewsByRoute(routeId: string): Promise<Review[]> {
    const response = await authenticatedFetch(`/reviews?routeId=${encodeURIComponent(routeId)}`);

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => normalizeReview(item)).filter((item): item is Review => item !== null);
  },

  async createReview(input: ReviewCreateInput): Promise<Review> {
    const response = await authenticatedFetch('/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const review = normalizeReview(await response.json());

    if (!review) {
      throw new Error('Invalid review response.');
    }

    return review;
  }
};