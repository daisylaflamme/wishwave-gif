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

export type MotionStyle = typeof MOTION_STYLES[number]['id'];

export const MOTION_PROMPTS: Record<MotionStyle, string> = {
  wave: "A natural, gentle birthday greeting motion. The person smiles softly and gives a small realistic hand wave toward the camera. Motion should be subtle, warm, stable, and believable. Keep the face consistent, preserve identity, avoid exaggerated body motion, avoid camera movement, avoid extra limbs or distorted hands.",
  smile: "The person makes a subtle natural smile and slight friendly head movement. Motion should be minimal, warm, realistic, and stable. Preserve identity and avoid distortion.",
  nod: "The person gives a gentle friendly nod with a soft smile. Motion should be subtle, realistic, and stable. Preserve identity and avoid distortion.",
};

export const STATIC_AUDIO_PATH = "/assets/audio/happy-birthday.m4a";

export const STATUS_STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'generating_video', label: 'Generating motion' },
  { key: 'finalizing', label: 'Finalizing greeting' },
  { key: 'ready', label: 'Ready!' },
] as const;
