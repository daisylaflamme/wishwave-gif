export const MOTION_STYLES = [
  {
    id: 'wave' as const,
    label: 'Wave',
    icon: '👋',
    description: 'A natural hand wave',
  },
  {
    id: 'smile' as const,
    label: 'Smile',
    icon: '😊',
    description: 'A warm, subtle smile',
  },
  {
    id: 'dance' as const,
    label: 'Dance',
    icon: '💃',
    description: 'A playful little dance',
  },
  {
    id: 'thumbs_up' as const,
    label: 'Thumbs Up',
    icon: '👍',
    description: 'A confident thumbs up',
  },
  {
    id: 'celebrate' as const,
    label: 'Celebrate',
    icon: '🎉',
    description: 'Cheerful celebration',
  },
  {
    id: 'custom' as const,
    label: 'Custom Motion',
    icon: '✍️',
    description: 'Describe your own subtle motion',
  },
] as const;

export const CUSTOM_MOTION_MAX = 100;

export const CUSTOM_MOTION_BLOCKED_WORDS = [
  'zoom', 'cinematic', 'anime', 'cartoon', 'background',
  'new person', 'extra people', 'weapon', 'explode', 'naked', 'remove clothes',
];

export function validateCustomMotion(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return 'Please describe the motion you want.';
  if (trimmed.length > CUSTOM_MOTION_MAX) return `Please keep it under ${CUSTOM_MOTION_MAX} characters.`;
  const lowered = trimmed.toLowerCase();
  if (CUSTOM_MOTION_BLOCKED_WORDS.some((w) => lowered.includes(w))) {
    return 'Please describe only subtle motion for the existing photo.';
  }
  return null;
}

export function buildCustomMotionPrompt(userPrompt: string): string {
  return `Subtle realistic motion only: ${userPrompt.trim()}. Preserve identity, framing, clothing, background, and facial consistency. No new people, objects, text, camera movement, or scene changes.`;
}

export type MotionStyle = typeof MOTION_STYLES[number]['id'];

export const FRAME_STYLES = [
  { id: 'none' as const, label: 'None', icon: '⬜', description: 'No frame' },
  { id: 'celebrate' as const, label: 'Celebrate', icon: '🎊', description: 'Confetti & sparkle' },
  { id: 'elegant' as const, label: 'Elegant', icon: '✨', description: 'Soft gold luxury' },
  { id: 'soft' as const, label: 'Soft Aesthetic', icon: '🌸', description: 'Pastel glow' },
  { id: 'love' as const, label: 'Love', icon: '💖', description: 'Romantic hearts' },
  { id: 'retro' as const, label: 'Retro Fun', icon: '📷', description: 'Polaroid vibes' },
  { id: 'cozy' as const, label: 'Cozy Rustic', icon: '🍂', description: 'Warm rustic paper' },
] as const;

export type FrameStyle = typeof FRAME_STYLES[number]['id'];

export const FRAME_PROMPT_FRAGMENTS: Record<Exclude<FrameStyle, 'none'>, string> = {
  celebrate: 'festive birthday-style confetti and sparkle',
  elegant: 'minimal gold and soft luxury',
  soft: 'pastel glow and delicate light',
  love: 'soft romantic hearts and warm glow',
  retro: 'playful retro film or polaroid-inspired',
  cozy: 'warm rustic paper, wood, or autumn-inspired',
};

const PROMPT_BASE =
  'Animate ONLY the person(s) present in the uploaded image. Keep facial identity, features, skin tone, hair, and clothing exactly as in the original — no morphing, no distortion, no face swap. Camera must remain perfectly stable: no zoom, no pan, no crop, no reframing. Preserve original composition, proportions, and background unchanged. DO NOT add new people, faces, objects, or background elements. DO NOT extend the image beyond its original boundaries. Motion must be subtle, realistic, and physically believable, contained within the original frame. Produce a smooth 5-second clip that loops seamlessly (start and end states should match closely). If MULTIPLE people are present, EVERY person must perform the action independently and simultaneously — none stay still — without merging or syncing unnaturally.';

const MOUTH_CLOSED =
  'CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, lips do not move as if forming words.';

export const MOTION_PROMPTS: Record<Exclude<MotionStyle, 'custom'>, string> = {
  wave: `${PROMPT_BASE} ACTION — WAVE: The person raises one hand to head/shoulder height in front of the body and clearly moves the hand side to side (right and left, back and forth) like a real waving gesture, repeating the side-to-side motion 2–3 times across the 5 seconds. Add a soft natural closed-mouth smile. ${MOUTH_CLOSED}`,
  smile: `${PROMPT_BASE} ACTION — SMILE: Apply a subtle, natural, warm smile with minimal facial movement. Only a gentle closed-mouth or softly parted smile that grows slightly and holds. ${MOUTH_CLOSED}`,
  dance: `${PROMPT_BASE} ACTION — DANCE: The person performs a small, playful, full-body dance in place to a cheerful rhythm. Hands and arms move naturally and rhythmically (relaxed gestures, light arm sway), while the legs, hips and torso also move — gentle knee bounce, subtle weight shift from foot to foot, and side-to-side hip sway. Feet stay roughly planted (no walking out of frame). Add a light closed-mouth smile. Joyful but contained. ${MOUTH_CLOSED}`,
  thumbs_up: `${PROMPT_BASE} ACTION — THUMBS UP: The person raises one hand into frame at chest height and gives a clear, confident thumbs-up gesture, holding it briefly, with a friendly closed-mouth smile. The thumbs-up must be clearly visible and recognizable. ${MOUTH_CLOSED}`,
  celebrate: `${PROMPT_BASE} ACTION — CELEBRATE: The person performs a cheerful celebration — both arms raised upward or outward in a joyful gesture (like a small "yay"), with a happy expression and a closed-mouth or softly smiling face. Slight head tilt is okay. Keep movement smooth and contained within the frame. ${MOUTH_CLOSED}`,
};

export const STATUS_STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'generating_video', label: 'Generating motion' },
  { key: 'finalizing', label: 'Finalizing greeting' },
  { key: 'ready', label: 'Ready!' },
] as const;
