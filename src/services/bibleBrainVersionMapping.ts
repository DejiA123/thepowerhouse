// Bible Brain API Version Mapping and Validation
import type { BibleVersion } from '@/types/bible';

// Known working Bible Brain version IDs from actual API testing
export const KNOWN_WORKING_VERSIONS = [
  'ASV', // American Standard Version - confirmed working
  'YLT', // Young's Literal Translation - confirmed working
  'WEB', // World English Bible - confirmed working
] as const;

// Version display mapping for confirmed working versions
export const VERSION_DISPLAY_NAMES: Record<string, { name: string; abbreviation: string; category: string }> = {
  'ASV': { name: 'American Standard Version', abbreviation: 'ASV', category: 'Traditional' },
  'YLT': { name: "Young's Literal Translation", abbreviation: 'YLT', category: 'Literal' },
  'WEB': { name: 'World English Bible', abbreviation: 'WEB', category: 'Modern' },
};

// Convert any version ID to a known working one
export const normalizeVersionId = (versionId: string): string => {
  // If it's already a known working version, return it
  if (KNOWN_WORKING_VERSIONS.includes(versionId as any)) {
    return versionId;
  }
  
  // Default fallback to ASV (confirmed working)
  console.log(`🔄 Normalizing unknown version '${versionId}' to 'ASV'`);
  return 'ASV';
};

// Get fallback versions if API fails
export const getFallbackVersions = (): BibleVersion[] => {
  return KNOWN_WORKING_VERSIONS.map(id => ({
    id,
    version: id,
    name: VERSION_DISPLAY_NAMES[id]?.name || id,
    abbreviation: VERSION_DISPLAY_NAMES[id]?.abbreviation || id,
    language: 'English',
    source: 'bible-brain' as const
  }));
};

// Validate if a version is likely to work
export const isValidBibleBrainVersion = (versionId: string): boolean => {
  return KNOWN_WORKING_VERSIONS.includes(versionId as any);
};