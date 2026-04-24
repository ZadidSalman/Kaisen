export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: number
  meta?: any
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number
    total: number
    hasMore: boolean
    [key: string]: any
  }
}
