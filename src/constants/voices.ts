/**
 * Kokoro TTS Voice Library
 * 54 pre-defined voices organized by language and gender
 */

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  region: string;
}

// Voice catalog from n8n implementation
export const VOICES: Record<string, Voice> = {
  // 🇺🇸 American English (Female)
  'af_alloy': { id: 'af_alloy', name: 'Alloy', language: 'en-US', gender: 'female', region: 'American' },
  'af_aoede': { id: 'af_aoede', name: 'Aoede', language: 'en-US', gender: 'female', region: 'American' },
  'af_bella': { id: 'af_bella', name: 'Bella', language: 'en-US', gender: 'female', region: 'American' },
  'af_heart': { id: 'af_heart', name: 'Heart', language: 'en-US', gender: 'female', region: 'American' },
  'af_jessica': { id: 'af_jessica', name: 'Jessica', language: 'en-US', gender: 'female', region: 'American' },
  'af_kore': { id: 'af_kore', name: 'Kore', language: 'en-US', gender: 'female', region: 'American' },
  'af_nicole': { id: 'af_nicole', name: 'Nicole', language: 'en-US', gender: 'female', region: 'American' },
  'af_nova': { id: 'af_nova', name: 'Nova', language: 'en-US', gender: 'female', region: 'American' },
  'af_river': { id: 'af_river', name: 'River', language: 'en-US', gender: 'female', region: 'American' },
  'af_sarah': { id: 'af_sarah', name: 'Sarah', language: 'en-US', gender: 'female', region: 'American' },
  'af_sky': { id: 'af_sky', name: 'Sky', language: 'en-US', gender: 'female', region: 'American' },

  // 🇺🇸 American English (Male)
  'am_adam': { id: 'am_adam', name: 'Adam', language: 'en-US', gender: 'male', region: 'American' },
  'am_echo': { id: 'am_echo', name: 'Echo', language: 'en-US', gender: 'male', region: 'American' },
  'am_eric': { id: 'am_eric', name: 'Eric', language: 'en-US', gender: 'male', region: 'American' },
  'am_fenrir': { id: 'am_fenrir', name: 'Fenrir', language: 'en-US', gender: 'male', region: 'American' },
  'am_liam': { id: 'am_liam', name: 'Liam', language: 'en-US', gender: 'male', region: 'American' },
  'am_michael': { id: 'am_michael', name: 'Michael', language: 'en-US', gender: 'male', region: 'American' },
  'am_onyx': { id: 'am_onyx', name: 'Onyx', language: 'en-US', gender: 'male', region: 'American' },
  'am_puck': { id: 'am_puck', name: 'Puck', language: 'en-US', gender: 'male', region: 'American' },
  'am_santa': { id: 'am_santa', name: 'Santa', language: 'en-US', gender: 'male', region: 'American' },

  // 🇬🇧 British English (Female)
  'bf_alice': { id: 'bf_alice', name: 'Alice', language: 'en-GB', gender: 'female', region: 'British' },
  'bf_emma': { id: 'bf_emma', name: 'Emma', language: 'en-GB', gender: 'female', region: 'British' },
  'bf_isabella': { id: 'bf_isabella', name: 'Isabella', language: 'en-GB', gender: 'female', region: 'British' },
  'bf_lily': { id: 'bf_lily', name: 'Lily', language: 'en-GB', gender: 'female', region: 'British' },

  // 🇬🇧 British English (Male)
  'bm_daniel': { id: 'bm_daniel', name: 'Daniel', language: 'en-GB', gender: 'male', region: 'British' },
  'bm_fable': { id: 'bm_fable', name: 'Fable', language: 'en-GB', gender: 'male', region: 'British' },
  'bm_george': { id: 'bm_george', name: 'George', language: 'en-GB', gender: 'male', region: 'British' },
  'bm_lewis': { id: 'bm_lewis', name: 'Lewis', language: 'en-GB', gender: 'male', region: 'British' },

  // 🇪🇸 Spanish (Female)
  'ef_dora': { id: 'ef_dora', name: 'Dora', language: 'es', gender: 'female', region: 'Spanish' },

  // 🇪🇸 Spanish (Male)
  'em_alex': { id: 'em_alex', name: 'Alex', language: 'es', gender: 'male', region: 'Spanish' },
  'em_santa': { id: 'em_santa', name: 'Santa', language: 'es', gender: 'male', region: 'Spanish' },

  // 🇫🇷 French (Female)
  'ff_siwis': { id: 'ff_siwis', name: 'Siwis', language: 'fr', gender: 'female', region: 'French' },

  // 🇮🇳 Hindi (Female)
  'hf_alpha': { id: 'hf_alpha', name: 'Alpha', language: 'hi', gender: 'female', region: 'Hindi' },
  'hf_beta': { id: 'hf_beta', name: 'Beta', language: 'hi', gender: 'female', region: 'Hindi' },

  // 🇮🇳 Hindi (Male)
  'hm_omega': { id: 'hm_omega', name: 'Omega', language: 'hi', gender: 'male', region: 'Hindi' },
  'hm_psi': { id: 'hm_psi', name: 'Psi', language: 'hi', gender: 'male', region: 'Hindi' },

  // 🇮🇹 Italian (Female)
  'if_sara': { id: 'if_sara', name: 'Sara', language: 'it', gender: 'female', region: 'Italian' },

  // 🇮🇹 Italian (Male)
  'im_nicola': { id: 'im_nicola', name: 'Nicola', language: 'it', gender: 'male', region: 'Italian' },

  // 🇯🇵 Japanese (Female)
  'jf_alpha': { id: 'jf_alpha', name: 'Alpha', language: 'ja', gender: 'female', region: 'Japanese' },
  'jf_gongitsune': { id: 'jf_gongitsune', name: 'Gongitsune', language: 'ja', gender: 'female', region: 'Japanese' },
  'jf_nezumi': { id: 'jf_nezumi', name: 'Nezumi', language: 'ja', gender: 'female', region: 'Japanese' },
  'jf_tebukuro': { id: 'jf_tebukuro', name: 'Tebukuro', language: 'ja', gender: 'female', region: 'Japanese' },

  // 🇯🇵 Japanese (Male)
  'jm_kumo': { id: 'jm_kumo', name: 'Kumo', language: 'ja', gender: 'male', region: 'Japanese' },

  // 🇧🇷 Brazilian Portuguese (Female)
  'pf_dora': { id: 'pf_dora', name: 'Dora', language: 'pt-BR', gender: 'female', region: 'Portuguese' },

  // 🇧🇷 Brazilian Portuguese (Male)
  'pm_alex': { id: 'pm_alex', name: 'Alex', language: 'pt-BR', gender: 'male', region: 'Portuguese' },
  'pm_santa': { id: 'pm_santa', name: 'Santa', language: 'pt-BR', gender: 'male', region: 'Portuguese' },

  // 🇨🇳 Mandarin Chinese (Female)
  'zf_xiaobei': { id: 'zf_xiaobei', name: 'Xiaobei', language: 'zh', gender: 'female', region: 'Mandarin' },
  'zf_xiaoni': { id: 'zf_xiaoni', name: 'Xiaoni', language: 'zh', gender: 'female', region: 'Mandarin' },
  'zf_xiaoxiao': { id: 'zf_xiaoxiao', name: 'Xiaoxiao', language: 'zh', gender: 'female', region: 'Mandarin' },
  'zf_xiaoyi': { id: 'zf_xiaoyi', name: 'Xiaoyi', language: 'zh', gender: 'female', region: 'Mandarin' },

  // 🇨🇳 Mandarin Chinese (Male)
  'zm_yunjian': { id: 'zm_yunjian', name: 'Yunjian', language: 'zh', gender: 'male', region: 'Mandarin' },
  'zm_yunxi': { id: 'zm_yunxi', name: 'Yunxi', language: 'zh', gender: 'male', region: 'Mandarin' },
  'zm_yunxia': { id: 'zm_yunxia', name: 'Yunxia', language: 'zh', gender: 'male', region: 'Mandarin' },
  'zm_yunyang': { id: 'zm_yunyang', name: 'Yunyang', language: 'zh', gender: 'male', region: 'Mandarin' },
};

/**
 * Get all available voices
 */
export function listAvailableVoices(): Voice[] {
  return Object.values(VOICES);
}

/**
 * Get voices by language
 */
export function getVoicesByLanguage(language: string): Voice[] {
  return Object.values(VOICES).filter(voice => voice.language === language);
}

/**
 * Get voices by region
 */
export function getVoicesByRegion(region: string): Voice[] {
  return Object.values(VOICES).filter(voice => voice.region === region);
}

/**
 * Validate if a voice ID exists
 */
export function isValidVoice(voiceId: string): boolean {
  return voiceId in VOICES;
}

/**
 * Get voice info by ID
 */
export function getVoice(voiceId: string): Voice | undefined {
  return VOICES[voiceId];
}


