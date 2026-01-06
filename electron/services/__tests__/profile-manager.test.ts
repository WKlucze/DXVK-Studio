/**
 * Profile Manager Unit Tests
 * Tests profile CRUD operations and validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import {
  getAllProfiles,
  saveProfile,
  deleteProfile
} from '../profile-manager'
import type { DxvkProfile } from '../../../src/shared/types'

// Mock electron app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn()
  }
}))

const FIXTURES_DIR = join(__dirname, 'fixtures-profiles')
const PROFILES_PATH = join(FIXTURES_DIR, 'profiles.json')

describe('Profile Manager', () => {
  beforeAll(() => {
    mkdirSync(FIXTURES_DIR, { recursive: true })
    // Mock getPath to return our fixtures dir
    vi.mocked(app.getPath).mockReturnValue(FIXTURES_DIR)
  })

  afterAll(() => {
    if (existsSync(FIXTURES_DIR)) {
      rmSync(FIXTURES_DIR, { recursive: true, force: true })
    }
  })

  beforeEach(() => {
    // Reset profiles file
    if (existsSync(PROFILES_PATH)) {
      rmSync(PROFILES_PATH)
    }
  })

  describe('getAllProfiles', () => {
    it('should return empty array when no user profiles exist', () => {
      const profiles = getAllProfiles()
      expect(profiles.length).toBe(0)
    })

    it('should return user profiles', () => {
      const userProfiles: DxvkProfile[] = [{
        id: 'user-1',
        name: 'My Custom Profile',
        isBuiltin: false
      }]
      writeFileSync(PROFILES_PATH, JSON.stringify(userProfiles))

      const profiles = getAllProfiles()
      expect(profiles.find(p => p.id === 'user-1')).toBeDefined()
      expect(profiles.length).toBe(1)
    })

    it('should handle corrupted profiles file', () => {
      writeFileSync(PROFILES_PATH, 'invalid json {')
      const profiles = getAllProfiles()
      // Should return empty array on corruption
      expect(profiles.length).toBe(0)
    })
  })

  describe('saveProfile', () => {
    it('should create new profile', () => {
      const newProfile = saveProfile({
        name: 'New Profile',
        enableAsync: true
      })

      expect(newProfile.id).toBeDefined()
      expect(newProfile.name).toBe('New Profile')

      const saved = JSON.parse(readFileSync(PROFILES_PATH, 'utf-8'))
      expect(saved[0].id).toBe(newProfile.id)
    })

    it('should update existing profile', () => {
      // First save one
      const created = saveProfile({ name: 'Original Name' })

      // Update it
      const updated = saveProfile({
        id: created.id,
        name: 'Updated Name'
      })

      expect(updated.id).toBe(created.id)
      expect(updated.name).toBe('Updated Name')

      const saved = JSON.parse(readFileSync(PROFILES_PATH, 'utf-8'))
      expect(saved.length).toBe(1)
      expect(saved[0].name).toBe('Updated Name')
    })
  })

  describe('deleteProfile', () => {
    it('should delete user profile', () => {
      const p1 = saveProfile({ name: 'P1' })
      const p2 = saveProfile({ name: 'P2' })

      const success = deleteProfile(p1.id!)
      expect(success).toBe(true)

      const saved = JSON.parse(readFileSync(PROFILES_PATH, 'utf-8'))
      expect(saved.length).toBe(1)
      expect(saved[0].id).toBe(p2.id)
    })

    it('should return false for non-existent profile', () => {
      const success = deleteProfile('non-existent-id')
      expect(success).toBe(false)
    })
  })
})
