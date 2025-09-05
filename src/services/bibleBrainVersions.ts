import type { BibleVersion } from '@/types/bible';

export const BIBLE_BRAIN_VERSION_MAPPINGS: Record<string, string> = {
  // English versions - these are common Bible Brain IDs
  'kjv': 'ENGKJV',
  'esv': 'ENGESV', 
  'niv': 'ENGNIV',
  'nlt': 'ENGNLT',
  'nkjv': 'ENGNKJ',
  'nasb': 'ENGNAB',
  'amp': 'ENGAMP',
  'msg': 'ENGMSG',
  'nrsv': 'ENGNRS',
  'rsv': 'ENGRSV',
  'asv': 'ENGASV',
  'darby': 'ENGDAR',
  'ylt': 'ENGYLT',
  'web': 'ENGWEB',
  'gnt': 'ENGGNT',
  'cev': 'ENGCEV',
  'net': 'ENGNET',
  // Add more mappings as needed
};

export const getDefaultVersions = (): BibleVersion[] => [
  { id: 'ENGKJV', name: 'King James Version', abbreviation: 'KJV', version: 'ENGKJV', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGESV', name: 'English Standard Version', abbreviation: 'ESV', version: 'ENGESV', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGNIV', name: 'New International Version', abbreviation: 'NIV', version: 'ENGNIV', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGNLT', name: 'New Living Translation', abbreviation: 'NLT', version: 'ENGNLT', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGNKJ', name: 'New King James Version', abbreviation: 'NKJV', version: 'ENGNKJ', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGNAB', name: 'New American Standard Bible', abbreviation: 'NASB', version: 'ENGNAB', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGAMP', name: 'Amplified Bible', abbreviation: 'AMP', version: 'ENGAMP', language: 'English', source: 'bible-brain' as const },
  { id: 'ENGGNT', name: 'Good News Translation', abbreviation: 'GNT', version: 'ENGGNT', language: 'English', source: 'bible-brain' as const },
];

export const mapVersionToBibleBrain = (version: string): string => {
  const mapped = BIBLE_BRAIN_VERSION_MAPPINGS[version.toLowerCase()];
  return mapped || version.toUpperCase() || 'ENGESV'; // Default to ESV
};