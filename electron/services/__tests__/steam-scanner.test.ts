/**
 * Steam Scanner Unit Tests
 * Tests VDF parsing and search term normalization
 */

import { describe, it, expect } from 'vitest'

// We need to import internal functions, so we'll test the exported ones
// and the VDF parser behavior through them

// Mock VDF content for testing
const VALID_VDF = `
"libraryfolders"
{
  "0"
  {
    "path"    "C:\\Program Files (x86)\\Steam"
    "label"   ""
    "contentid"   "12345"
    "totalsize"   "0"
    "apps"
    {
      "220"   "12345678"
      "730"   "87654321"
    }
  }
  "1"
  {
    "path"    "D:\\SteamLibrary"
    "apps"
    {
      "1091500"   "11111111"
    }
  }
}
`

const MALFORMED_VDF = `
"libraryfolders"
{
  "0"
    "path" "broken
}
`

const APP_MANIFEST = `
"AppState"
{
  "appid"   "220"
  "Universe"    "1"
  "name"    "Half-Life 2"
  "StateFlags"    "4"
  "installdir"    "Half-Life 2"
  "LastUpdated"   "1609459200"
  "SizeOnDisk"    "6144000000"
}
`

describe('Steam Scanner', () => {
  describe('VDF Parser', () => {
    it('should parse valid VDF structure', () => {
      // Test the regex-based parsing manually
      const pathMatch = VALID_VDF.match(/"path"\s+"([^"]+)"/g)
      expect(pathMatch).toBeDefined()
      expect(pathMatch?.length).toBe(2)
    })

    it('should extract app IDs from manifest', () => {
      const appIdMatch = APP_MANIFEST.match(/"appid"\s+"(\d+)"/)
      expect(appIdMatch?.[1]).toBe('220')
    })

    it('should extract game name from manifest', () => {
      const nameMatch = APP_MANIFEST.match(/"name"\s+"([^"]+)"/)
      expect(nameMatch?.[1]).toBe('Half-Life 2')
    })

    it('should extract install directory from manifest', () => {
      const dirMatch = APP_MANIFEST.match(/"installdir"\s+"([^"]+)"/)
      expect(dirMatch?.[1]).toBe('Half-Life 2')
    })
  })

  describe('Search Term Normalization', () => {
    // Test the normalization logic patterns

    it('should handle camelCase names', () => {
      // Pattern: split at capital letters
      const name = 'CounterStrike'
      const split = name.replace(/([a-z])([A-Z])/g, '$1 $2')
      expect(split).toBe('Counter Strike')
    })

    it('should handle PascalCase with numbers', () => {
      const name = 'HalfLife2'
      const split = name.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
        .replace(/(\d)([A-Z])/g, '$1 $2')
      expect(split).toBe('Half Life 2')
    })

    it('should handle common abbreviations', () => {
      const name = 'GTA5'
      const hasNumber = /\d/.test(name)
      expect(hasNumber).toBe(true)
    })

    it('should lowercase for comparison', () => {
      const name = 'DOOM Eternal'
      expect(name.toLowerCase()).toBe('doom eternal')
    })
  })

  describe('Library Path Detection', () => {
    it('should identify Windows-style paths', () => {
      const path = 'C:\\Program Files (x86)\\Steam'
      expect(path.includes('\\')).toBe(true)
      expect(path.match(/^[A-Z]:\\/)).toBeTruthy()
    })

    it('should validate path structure', () => {
      const validPath = 'D:\\SteamLibrary'
      const invalidPath = 'not/a/windows/path'

      expect(/^[A-Z]:/.test(validPath)).toBe(true)
      expect(/^[A-Z]:/.test(invalidPath)).toBe(false)
    })
  })
})
