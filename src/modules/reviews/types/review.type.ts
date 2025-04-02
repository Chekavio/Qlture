export type PublicReview = {
    id: any;
    rating: number;
    reviewText?: string;
    date: Date;
    user: {
      id: string;
      username: string;
      avatar: string | null;
    };
    likesCount: number;
    commentsCount: number;
    isCurrentUser: boolean;
    isLiked: boolean;
    comments: any[]; // Tu peux typer ça plus précisément si tu veux
  };
  