export interface LaravelDataResponse<T> {
  data: T;
}

export interface LaravelPaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface LaravelPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: LaravelPaginationLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface LaravelPaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: LaravelPaginationMeta;
}