export interface IUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  description?: string;
  avatar?: string;
  provider?: string;
  providerId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  review_count: number;
  moovie_count: number;
  book_count: number;
  games_count: number;
  watch_list_count: number;
  read_list_count: number;
  game_list_count: number;
}

export interface IUserWithPassword extends IUser {
  password?: string;
}