
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { DxvkProfile } from '../../src/shared/types'
import { v4 as uuidv4 } from 'uuid'

const PROFILES_FILE = 'profiles.json'

// Hardcoded built-in profiles
const BUILTIN_PROFILES: DxvkProfile[] = [
  {
    id: 'builtin-default',
    name: 'DXVK Defaults',
    description: 'Standard DXVK behavior with no overrides.',
    isBuiltin: true,
    enableAsync: true,
    logLevel: 'warn'
  },
  {
    id: 'builtin-performance',
    name: 'Max Performance',
    description: 'Optimized for lowest latency and highest throughput.',
    isBuiltin: true,
    enableAsync: true,
    numCompilerThreads: 0, // Auto
    maxFrameLatency: 1,
    syncInterval: 0, // No VSync
    logLevel: 'none',
    enableHDR: false
  },
  {
    id: 'builtin-compatibility',
    name: 'Compatibility Mode',
    description: 'Safest settings for troublesome games.',
    isBuiltin: true,
    enableAsync: false, // Async can cause crashes in some games
    numCompilerThreads: 1,
    maxFrameLatency: 3,
    logLevel: 'info'
  },
  {
    id: 'builtin-debugging',
    name: 'Debugging',
    description: 'Enables HUD and detailed logging.',
    isBuiltin: true,
    enableAsync: true,
    hud: ['full'],
    logLevel: 'debug'
  }
]

function getProfilesPath(): string {
  return join(app.getPath('userData'), PROFILES_FILE)
}


function validateProfile(profile: any): profile is DxvkProfile {
  return (
    typeof profile === 'object' &&
    profile !== null &&
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    (profile.isBuiltin === undefined || typeof profile.isBuiltin === 'boolean')
    // We can add more checks here if needed, but this covers the basics
  )
}

function loadUserProfiles(): DxvkProfile[] {
  const path = getProfilesPath()
  if (!existsSync(path)) {
    return []
  }

  try {
    const data = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(data)

    if (!Array.isArray(parsed)) {
      console.warn('Invalid profiles format: not an array')
      return []
    }

    const validProfiles = parsed.filter(validateProfile)

    if (validProfiles.length < parsed.length) {
      console.warn(`Skipped ${parsed.length - validProfiles.length} invalid profiles`)
    }

    return validProfiles
  } catch (error) {
    console.error('Failed to load profiles:', error)
    return []
  }
}

function saveUserProfiles(profiles: DxvkProfile[]): void {
  const path = getProfilesPath()
  try {
    writeFileSync(path, JSON.stringify(profiles, null, 2))
  } catch (error) {
    console.error('Failed to save profiles:', error)
    throw error
  }
}

export function getAllProfiles(): DxvkProfile[] {
  const userProfiles = loadUserProfiles()
  return [...BUILTIN_PROFILES, ...userProfiles]
}

export function saveProfile(profile: Omit<DxvkProfile, 'id'> & { id?: string }): DxvkProfile {
  const userProfiles = loadUserProfiles()

  // If it's a new profile or doesn't have an ID
  const id = profile.id || uuidv4()

  const newProfile: DxvkProfile = {
    ...profile,
    id,
    isBuiltin: false
  }

  const existingIndex = userProfiles.findIndex(p => p.id === id)

  if (existingIndex >= 0) {
    // Update existing
    userProfiles[existingIndex] = newProfile
  } else {
    // Add new
    userProfiles.push(newProfile)
  }

  saveUserProfiles(userProfiles)
  return newProfile
}

export function deleteProfile(id: string): boolean {
  // Prevent deleting built-ins
  if (BUILTIN_PROFILES.some(p => p.id === id)) {
    throw new Error('Cannot delete built-in profile')
  }

  const userProfiles = loadUserProfiles()
  const filtered = userProfiles.filter(p => p.id !== id)

  if (filtered.length === userProfiles.length) {
    return false // Not found
  }

  saveUserProfiles(filtered)
  return true
}
