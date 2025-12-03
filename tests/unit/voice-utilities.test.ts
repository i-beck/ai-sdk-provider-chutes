import { describe, it, expect } from 'vitest';
import {
  VOICES,
  listAvailableVoices,
  getVoicesByLanguage,
  getVoicesByRegion,
  isValidVoice,
  getVoice,
  type Voice,
} from '../../src/constants/voices';

describe('Voice Utilities', () => {
  describe('VOICES constant', () => {
    it('should export VOICES object', () => {
      expect(VOICES).toBeDefined();
      expect(typeof VOICES).toBe('object');
      expect(Object.keys(VOICES).length).toBeGreaterThan(0);
    });

    it('should have correct voice structure', () => {
      const voice = VOICES['af_bella'];
      expect(voice).toHaveProperty('id');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('language');
      expect(voice).toHaveProperty('gender');
      expect(voice).toHaveProperty('region');
    });
  });

  describe('listAvailableVoices', () => {
    it('should return all 54 voices', () => {
      const voices = listAvailableVoices();
      expect(voices).toBeDefined();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBe(54);
    });

    it('should return voice objects with all required fields', () => {
      const voices = listAvailableVoices();
      voices.forEach(voice => {
        expect(voice.id).toBeDefined();
        expect(voice.name).toBeDefined();
        expect(voice.language).toBeDefined();
        expect(voice.gender).toBeDefined();
        expect(voice.region).toBeDefined();
      });
    });

    it('should include popular voices', () => {
      const voices = listAvailableVoices();
      const voiceIds = voices.map(v => v.id);
      
      // Check for popular voices mentioned in README
      expect(voiceIds).toContain('af_bella');
      expect(voiceIds).toContain('am_adam');
      expect(voiceIds).toContain('bf_emma');
      expect(voiceIds).toContain('bm_george');
    });
  });

  describe('getVoicesByLanguage', () => {
    it('should filter American English voices', () => {
      const voices = getVoicesByLanguage('en-US');
      expect(voices.length).toBe(20); // Per README: 20 American English voices
      voices.forEach(voice => {
        expect(voice.language).toBe('en-US');
      });
    });

    it('should filter British English voices', () => {
      const voices = getVoicesByLanguage('en-GB');
      expect(voices.length).toBe(8); // Per README: 8 British English voices
      voices.forEach(voice => {
        expect(voice.language).toBe('en-GB');
      });
    });

    it('should filter Spanish voices', () => {
      const voices = getVoicesByLanguage('es');
      expect(voices.length).toBeGreaterThan(0);
      voices.forEach(voice => {
        expect(voice.language).toBe('es');
      });
    });

    it('should filter Japanese voices', () => {
      const voices = getVoicesByLanguage('ja');
      expect(voices.length).toBe(5); // Per README: 5 Japanese voices
      voices.forEach(voice => {
        expect(voice.language).toBe('ja');
      });
    });

    it('should filter Mandarin Chinese voices', () => {
      const voices = getVoicesByLanguage('zh');
      expect(voices.length).toBe(8); // Per README: 8 Mandarin Chinese voices
      voices.forEach(voice => {
        expect(voice.language).toBe('zh');
      });
    });

    it('should return empty array for unsupported language', () => {
      const voices = getVoicesByLanguage('unknown-lang');
      expect(voices).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const uppercase = getVoicesByLanguage('EN-US');
      const lowercase = getVoicesByLanguage('en-us');
      expect(uppercase.length).toBe(lowercase.length);
    });
  });

  describe('getVoicesByRegion', () => {
    it('should filter American region voices', () => {
      const voices = getVoicesByRegion('American');
      expect(voices.length).toBe(20);
      voices.forEach(voice => {
        expect(voice.region).toBe('American');
      });
    });

    it('should filter British region voices', () => {
      const voices = getVoicesByRegion('British');
      expect(voices.length).toBe(8);
      voices.forEach(voice => {
        expect(voice.region).toBe('British');
      });
    });

    it('should be case-sensitive by default', () => {
      const properCase = getVoicesByRegion('American');
      const lowercase = getVoicesByRegion('american');
      // Function filters exact match, so these will be different
      expect(properCase.length).toBeGreaterThan(0);
      expect(lowercase.length).toBe(0);
    });

    it('should return empty array for unsupported region', () => {
      const voices = getVoicesByRegion('unknown-region');
      expect(voices).toEqual([]);
    });
  });

  describe('isValidVoice', () => {
    it('should validate af_bella as valid', () => {
      expect(isValidVoice('af_bella')).toBe(true);
    });

    it('should validate am_adam as valid', () => {
      expect(isValidVoice('am_adam')).toBe(true);
    });

    it('should validate bf_emma as valid', () => {
      expect(isValidVoice('bf_emma')).toBe(true);
    });

    it('should validate bm_george as valid', () => {
      expect(isValidVoice('bm_george')).toBe(true);
    });

    it('should reject invalid voice ID', () => {
      expect(isValidVoice('invalid_voice')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidVoice('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidVoice('AF_BELLA')).toBe(false); // Should be lowercase
    });
  });

  describe('getVoice', () => {
    it('should return voice object by ID', () => {
      const voice = getVoice('af_bella');
      expect(voice).toBeDefined();
      expect(voice?.id).toBe('af_bella');
      expect(voice?.name).toBeDefined();
      expect(voice?.language).toBeDefined();
    });

    it('should return voice with all required fields', () => {
      const voice = getVoice('am_adam');
      expect(voice).toBeDefined();
      expect(voice?.id).toBe('am_adam');
      expect(voice?.name).toBeDefined();
      expect(voice?.language).toBeDefined();
      expect(voice?.gender).toBeDefined();
      expect(voice?.region).toBeDefined();
    });

    it('should return undefined for invalid voice ID', () => {
      const voice = getVoice('invalid_voice');
      expect(voice).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const voice = getVoice('');
      expect(voice).toBeUndefined();
    });
  });

  describe('Voice Categories', () => {
    it('should have voices from all documented language categories', () => {
      const allVoices = listAvailableVoices();
      const languages = new Set(allVoices.map(v => v.language));

      // Per README, should have these language categories:
      expect(languages.has('en-US')).toBe(true); // American English
      expect(languages.has('en-GB')).toBe(true); // British English
      expect(languages.has('es')).toBe(true); // Spanish
      expect(languages.has('fr')).toBe(true); // French
      expect(languages.has('hi')).toBe(true); // Hindi
      expect(languages.has('it')).toBe(true); // Italian
      expect(languages.has('ja')).toBe(true); // Japanese
      expect(languages.has('pt-BR')).toBe(true); // Portuguese (Brazilian)
      expect(languages.has('zh')).toBe(true); // Mandarin Chinese
    });

    it('should have both male and female voices', () => {
      const allVoices = listAvailableVoices();
      const genders = new Set(allVoices.map(v => v.gender));

      expect(genders.has('female')).toBe(true);
      expect(genders.has('male')).toBe(true);
    });

    it('should have voices from multiple regions', () => {
      const allVoices = listAvailableVoices();
      const regions = new Set(allVoices.map(v => v.region.toLowerCase()));

      expect(regions.has('american')).toBe(true);
      expect(regions.has('british')).toBe(true);
      expect(regions.size).toBeGreaterThan(2); // Should have more regions
    });
  });

  describe('Voice Count Verification', () => {
    it('should have correct count per language as documented in README', () => {
      // Per README documentation:
      // - American English: 20 voices (11 female, 9 male)
      // - British English: 8 voices (4 female, 4 male)
      // - Spanish: 3 voices
      // - French: 1 voice
      // - Hindi: 4 voices
      // - Italian: 2 voices
      // - Japanese: 5 voices
      // - Portuguese (BR): 3 voices
      // - Mandarin Chinese: 8 voices
      // Total: 54 voices

      expect(getVoicesByLanguage('en-US').length).toBe(20);
      expect(getVoicesByLanguage('en-GB').length).toBe(8);
      expect(getVoicesByLanguage('es').length).toBe(3);
      expect(getVoicesByLanguage('fr').length).toBe(1);
      expect(getVoicesByLanguage('hi').length).toBe(4);
      expect(getVoicesByLanguage('it').length).toBe(2);
      expect(getVoicesByLanguage('ja').length).toBe(5);
      expect(getVoicesByLanguage('pt-BR').length).toBe(3);
      expect(getVoicesByLanguage('zh').length).toBe(8);
    });

    it('should total 54 voices', () => {
      const total = 
        getVoicesByLanguage('en-US').length +
        getVoicesByLanguage('en-GB').length +
        getVoicesByLanguage('es').length +
        getVoicesByLanguage('fr').length +
        getVoicesByLanguage('hi').length +
        getVoicesByLanguage('it').length +
        getVoicesByLanguage('ja').length +
        getVoicesByLanguage('pt-BR').length +
        getVoicesByLanguage('zh').length;

      expect(total).toBe(54);
      expect(listAvailableVoices().length).toBe(54);
    });
  });
});

