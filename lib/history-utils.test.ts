
import { describe, it, expect } from 'vitest'
import { 
  normalizeAniListEntry, 
  normalizeLocalEntry, 
  mergeWatchHistory,
  NormalizedWatchEntry 
} from './history-utils'

describe('History Utils', () => {
  describe('normalizeAniListEntry', () => {
    it('should normalize AniList entry correctly', () => {
      const mockEntry = {
        updatedAt: 1620000000,
        media: {
          id: 1,
          title: {
            english: 'Anime English',
            romaji: 'Anime Romaji'
          },
          coverImage: {
            large: 'image-url'
          },
          episodes: 12
        }
      }
      const result = normalizeAniListEntry(mockEntry)
      expect(result).toEqual({
        id: 1,
        title: 'Anime English',
        episodeCount: 12,
        lastWatchedAt: new Date(1620000000 * 1000),
        source: 'AniList',
        image: 'image-url'
      })
    })

    it('should fallback to romaji title if english is missing', () => {
      const mockEntry = {
        updatedAt: 1620000000,
        media: {
          id: 1,
          title: {
            english: null,
            romaji: 'Anime Romaji'
          },
          coverImage: {
            large: 'image-url'
          },
          episodes: 12
        }
      }
      const result = normalizeAniListEntry(mockEntry)
      expect(result.title).toBe('Anime Romaji')
    })
  })

  describe('normalizeLocalEntry', () => {
    it('should normalize local entry correctly', () => {
      const mockEntry = {
        viewedAt: '2023-01-01T00:00:00.000Z',
        themeId: {
          _id: 'theme-id',
          songTitle: 'Song Title',
          animeTitle: 'Anime Title',
          animeCoverImageSmall: 'small-image',
          type: 'OP',
          slug: 'song-slug'
        }
      }
      const result = normalizeLocalEntry(mockEntry)
      expect(result).toEqual({
        id: 'theme-id',
        title: 'Song Title',
        animeTitle: 'Anime Title',
        lastWatchedAt: new Date('2023-01-01T00:00:00.000Z'),
        source: 'Local',
        image: 'small-image',
        type: 'OP',
        slug: 'song-slug'
      })
    })

    it('should fallback to animeCoverImage if animeCoverImageSmall is missing', () => {
      const mockEntry = {
        viewedAt: '2023-01-01T00:00:00.000Z',
        themeId: {
          _id: 'theme-id',
          songTitle: 'Song Title',
          animeTitle: 'Anime Title',
          animeCoverImageSmall: null,
          animeCoverImage: 'large-image',
          type: 'OP',
          slug: 'song-slug'
        }
      }
      const result = normalizeLocalEntry(mockEntry)
      expect(result.image).toBe('large-image')
    })
  })

  describe('mergeWatchHistory', () => {
    it('should merge entries and sort by date', () => {
      const local: NormalizedWatchEntry[] = [
        { id: 'l1', title: 'Local 1', lastWatchedAt: new Date('2023-01-01'), source: 'Local', image: '' }
      ]
      const remote: NormalizedWatchEntry[] = [
        { id: 1, title: 'Remote 1', lastWatchedAt: new Date('2023-01-02'), source: 'AniList', image: '' }
      ]
      const result = mergeWatchHistory(local, remote)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1) // Newer date first
    })

    it('should deduplicate entries with local precedence', () => {
      const local: NormalizedWatchEntry[] = [
        { id: 'l1', title: 'Same Title', lastWatchedAt: new Date('2023-01-05'), source: 'Local', image: 'local-img' }
      ]
      const remote: NormalizedWatchEntry[] = [
        { id: 1, title: 'Same Title', lastWatchedAt: new Date('2023-01-01'), source: 'AniList', image: 'remote-img' }
      ]
      const result = mergeWatchHistory(local, remote)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('Local')
      expect(result[0].image).toBe('local-img')
    })

    it('should deduplicate using animeTitle', () => {
      const local: NormalizedWatchEntry[] = [
        { id: 'l1', title: 'Song', animeTitle: 'Anime', lastWatchedAt: new Date('2023-01-05'), source: 'Local', image: '' }
      ]
      const remote: NormalizedWatchEntry[] = [
        { id: 1, title: 'Anime', lastWatchedAt: new Date('2023-01-01'), source: 'AniList', image: '' }
      ]
      const result = mergeWatchHistory(local, remote)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('Local')
    })
  })
})
