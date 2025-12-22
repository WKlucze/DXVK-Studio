/**
 * PE Analyzer Unit Tests
 * Tests architecture detection from PE headers
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { analyzeExecutable, findGameExecutables } from '../pe-analyzer'

const TEST_DIR = join(__dirname, 'fixtures')

// Minimal PE headers for testing
// 32-bit PE header
const PE_32BIT = Buffer.from([
  // DOS Header
  0x4D, 0x5A, // MZ magic
  ...Array(58).fill(0), // Padding to 0x3C
  0x40, 0x00, 0x00, 0x00, // e_lfanew = 64 (0x40)

  // PE Signature at offset 64
  0x50, 0x45, 0x00, 0x00, // "PE\0\0"

  // COFF Header - Machine type
  0x4C, 0x01, // IMAGE_FILE_MACHINE_I386 (0x014c)
])

// 64-bit PE header
const PE_64BIT = Buffer.from([
  // DOS Header
  0x4D, 0x5A, // MZ magic
  ...Array(58).fill(0), // Padding to 0x3C
  0x40, 0x00, 0x00, 0x00, // e_lfanew = 64 (0x40)

  // PE Signature at offset 64
  0x50, 0x45, 0x00, 0x00, // "PE\0\0"

  // COFF Header - Machine type
  0x64, 0x86, // IMAGE_FILE_MACHINE_AMD64 (0x8664)
])

// Invalid file (not a PE)
const INVALID_FILE = Buffer.from([
  0x7F, 0x45, 0x4C, 0x46 // ELF magic (Linux executable)
])

describe('PE Analyzer', () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }
    writeFileSync(join(TEST_DIR, 'test32.exe'), PE_32BIT)
    writeFileSync(join(TEST_DIR, 'test64.exe'), PE_64BIT)
    writeFileSync(join(TEST_DIR, 'invalid.exe'), INVALID_FILE)
  })

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('analyzeExecutable', () => {
    it('should detect 32-bit architecture', () => {
      const result = analyzeExecutable(join(TEST_DIR, 'test32.exe'))
      expect(result.isValid).toBe(true)
      expect(result.architecture).toBe('32')
      expect(result.machineType).toBe(0x014c)
    })

    it('should detect 64-bit architecture', () => {
      const result = analyzeExecutable(join(TEST_DIR, 'test64.exe'))
      expect(result.isValid).toBe(true)
      expect(result.architecture).toBe('64')
      expect(result.machineType).toBe(0x8664)
    })

    it('should handle invalid PE files', () => {
      const result = analyzeExecutable(join(TEST_DIR, 'invalid.exe'))
      expect(result.isValid).toBe(false)
      expect(result.architecture).toBe('unknown')
      expect(result.error).toBeDefined()
    })

    it('should handle missing files', () => {
      const result = analyzeExecutable(join(TEST_DIR, 'nonexistent.exe'))
      expect(result.isValid).toBe(false)
      expect(result.architecture).toBe('unknown')
    })
  })

  describe('findGameExecutables', () => {
    beforeAll(() => {
      // Create test executables
      writeFileSync(join(TEST_DIR, 'game.exe'), PE_32BIT)
      writeFileSync(join(TEST_DIR, 'launcher.exe'), PE_32BIT)
      writeFileSync(join(TEST_DIR, 'unins000.exe'), PE_32BIT) // Should be filtered
      writeFileSync(join(TEST_DIR, 'vcredist_x64.exe'), PE_32BIT) // Should be filtered
    })

    it('should find game executables', () => {
      const exes = findGameExecutables(TEST_DIR)
      expect(exes).toContain('game.exe')
      expect(exes).toContain('launcher.exe')
    })

    it('should filter unwanted executables', () => {
      const exes = findGameExecutables(TEST_DIR)
      expect(exes).not.toContain('unins000.exe')
      expect(exes).not.toContain('vcredist_x64.exe')
    })

    it('should return empty for non-existent directory', () => {
      const exes = findGameExecutables('/nonexistent/path')
      expect(exes).toEqual([])
    })
  })
})
