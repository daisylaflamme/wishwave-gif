export const MOTION_STYLES = [
  {
    id: 'wave' as const,
    label: 'Wave',
    icon: '👋',
    description: 'A gentle hand wave',
  },
  {
    id: 'smile' as const,
    label: 'Smile',
    icon: '😊',
    description: 'A warm smile',
  },
  {
    id: 'nod' as const,
    label: 'Nod',
    icon: '🙂',
    description: 'A friendly nod',
  },
] as const;

export const AUDIO_STYLES = [
  {
    id: 'cheerful' as const,
    label: 'Cheerful Instrumental',
    icon: '🎵',
    description: 'Upbeat birthday melody',
  },
  {
    id: 'party' as const,
    label: 'Party Chime',
    icon: '🎉',
    description: 'Fun party ambience',
  },
] as const;

export type MotionStyle = typeof MOTION_STYLES[number]['id'];
export type AudioStyle = typeof AUDIO_STYLES[number]['id'];

export const MOTION_PROMPTS: Record<MotionStyle, string> = {
  wave: "A natural, gentle birthday greeting motion. The person smiles softly and gives a small realistic hand wave toward the camera. Motion should be subtle, warm, stable, and believable. Keep the face consistent, preserve identity, avoid exaggerated body motion, avoid camera movement, avoid extra limbs or distorted hands.",
  smile: "The person makes a subtle natural smile and slight friendly head movement. Motion should be minimal, warm, realistic, and stable. Preserve identity and avoid distortion.",
  nod: "The person gives a gentle friendly nod with a soft smile. Motion should be subtle, realistic, and stable. Preserve identity and avoid distortion.",
};

export const AUDIO_PROMPTS: Record<AudioStyle, string> = {
  cheerful: "Cheerful upbeat birthday instrumental music, happy celebratory melody with piano and light percussion, warm and joyful tone, suitable for a birthday greeting card",
  party: "Birthday party ambience with chimes, gentle confetti pop sounds, subtle crowd cheering, festive and celebratory atmosphere, short jingle",
};

export const STATUS_STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'generating_video', label: 'Generating motion' },
  { key: 'generating_audio', label: 'Generating audio' },
  { key: 'ready', label: 'Ready!' },
] as const;
