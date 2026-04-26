import { describe, expect, it } from 'vitest'
import { selectCommonModeThemeCandidate } from './quiz-room-utils'

function createRandomSequence(values: number[]) {
  let index = 0
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0
    index += 1
    return value
  }
}

describe('selectCommonModeThemeCandidate', () => {
  it('limits common-mode selection to locally shared OP/ED entries for the chosen anime', () => {
    const playerProfiles: any[] = [
      {
        userId: 'player-a',
        syncedAnimeIds: new Set([101]),
        libraryAnimeIds: new Set([101]),
        exactThemeIdsByAnimeId: new Map([[101, new Set(['op-1', 'ed-1'])]]),
      },
      {
        userId: 'player-b',
        syncedAnimeIds: new Set([101]),
        libraryAnimeIds: new Set([101]),
        exactThemeIdsByAnimeId: new Map([[101, new Set(['op-1', 'ed-1'])]]),
      },
    ]

    const animeThemes: any[] = [
      { _id: 'op-1', anilistId: 101, animeTitle: 'Shared Show', type: 'OP', sequence: 1, slug: 'shared-show-op1', audioUrl: 'https://audio/op1.mp3' },
      { _id: 'ed-1', anilistId: 101, animeTitle: 'Shared Show', type: 'ED', sequence: 1, slug: 'shared-show-ed1', audioUrl: 'https://audio/ed1.mp3' },
      { _id: 'op-2', anilistId: 101, animeTitle: 'Shared Show', type: 'OP', sequence: 2, slug: 'shared-show-op2', audioUrl: 'https://audio/op2.mp3' },
    ]

    const selection = selectCommonModeThemeCandidate(playerProfiles, animeThemes, createRandomSequence([0, 0.99]))

    expect(selection).not.toBeNull()
    expect(selection?.candidateThemeIds).toEqual(['op-1', 'ed-1'])
    expect(selection?.selectedTheme._id).toBe('ed-1')
  })

  it('allows anime-level sync to intersect with the other player exact watched theme', () => {
    const playerProfiles: any[] = [
      {
        userId: 'player-a',
        syncedAnimeIds: new Set(),
        libraryAnimeIds: new Set([202]),
        exactThemeIdsByAnimeId: new Map([[202, new Set(['op-a'])]]),
      },
      {
        userId: 'player-b',
        syncedAnimeIds: new Set([202]),
        libraryAnimeIds: new Set([202]),
        exactThemeIdsByAnimeId: new Map(),
      },
    ]

    const animeThemes: any[] = [
      { _id: 'op-a', anilistId: 202, animeTitle: 'Hybrid Show', type: 'OP', sequence: 1, slug: 'hybrid-show-op1', audioUrl: 'https://audio/op-a.mp3' },
      { _id: 'ed-a', anilistId: 202, animeTitle: 'Hybrid Show', type: 'ED', sequence: 1, slug: 'hybrid-show-ed1', audioUrl: 'https://audio/ed-a.mp3' },
    ]

    const selection = selectCommonModeThemeCandidate(playerProfiles, animeThemes, createRandomSequence([0, 0]))

    expect(selection).not.toBeNull()
    expect(selection?.candidateThemeIds).toEqual(['op-a'])
    expect(selection?.selectedTheme._id).toBe('op-a')
  })

  it('tries another shared anime when the first shared title has no valid shared theme candidates', () => {
    const playerProfiles: any[] = [
      {
        userId: 'player-a',
        syncedAnimeIds: new Set([301, 302]),
        libraryAnimeIds: new Set([301, 302]),
        exactThemeIdsByAnimeId: new Map([
          [301, new Set(['a-op'])],
          [302, new Set(['b-op'])],
        ]),
      },
      {
        userId: 'player-b',
        syncedAnimeIds: new Set([301, 302]),
        libraryAnimeIds: new Set([301, 302]),
        exactThemeIdsByAnimeId: new Map([
          [301, new Set(['a-ed'])],
          [302, new Set(['b-op'])],
        ]),
      },
    ]

    const animeThemes: any[] = [
      { _id: 'a-op', anilistId: 301, animeTitle: 'Mismatch Show', type: 'OP', sequence: 1, slug: 'mismatch-op1', audioUrl: 'https://audio/a-op.mp3' },
      { _id: 'a-ed', anilistId: 301, animeTitle: 'Mismatch Show', type: 'ED', sequence: 1, slug: 'mismatch-ed1', audioUrl: 'https://audio/a-ed.mp3' },
      { _id: 'b-op', anilistId: 302, animeTitle: 'Match Show', type: 'OP', sequence: 1, slug: 'match-op1', audioUrl: 'https://audio/b-op.mp3' },
    ]

    const selection = selectCommonModeThemeCandidate(playerProfiles, animeThemes, createRandomSequence([0, 0, 0]))

    expect(selection).not.toBeNull()
    expect(selection?.selectedAnimeId).toBe(302)
    expect(selection?.selectedTheme._id).toBe('b-op')
  })
})
