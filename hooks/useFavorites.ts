'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFavoriteThemes, addFavoriteTheme, removeFavoriteTheme } from '@/lib/api/themes'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

export function useFavorites() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => fetchFavoriteThemes(),
    enabled: !!user,
  })

  const favoriteIds = new Set(favorites?.data?.map((f: any) => f._id) || [])

  const addMutation = useMutation({
    mutationFn: ({ themeId, themeSlug }: { themeId: string; themeSlug: string }) => 
      addFavoriteTheme(themeId, themeSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      toast.success('Added to favorites')
    },
    onError: () => {
      toast.error('Failed to add to favorites')
    }
  })

  const removeMutation = useMutation({
    mutationFn: (themeId: string) => removeFavoriteTheme(themeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      toast.success('Removed from favorites')
    },
    onError: () => {
      toast.error('Failed to remove from favorites')
    }
  })

  const toggleFavorite = (themeId: string, themeSlug: string) => {
    if (!user) {
      toast.error('Please login to favorite themes')
      return
    }

    if (favoriteIds.has(themeId)) {
      removeMutation.mutate(themeId)
    } else {
      addMutation.mutate({ themeId, themeSlug })
    }
  }

  return {
    favorites: favorites?.data || [],
    isLoading,
    isFavorited: (themeId: string) => favoriteIds.has(themeId),
    toggleFavorite,
    isToggling: addMutation.isPending || removeMutation.isPending
  }
}
