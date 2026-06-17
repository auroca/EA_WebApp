export interface ReviewRating {
  label: string;
  score: number;
}

export interface Review {
  _id: string;
  routeId: string;
  userId: string;
  title: string;
  comment?: string;
  ratings: ReviewRating[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewCreateInput {
  routeId: string;
  title: string;
  comment?: string;
  ratings: ReviewRating[];
}