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
    id: 'laugh' as const,
    label: 'Laugh',
    icon: '😄',
    description: 'A genuine happy laugh',
  },
  {
    id: 'wink' as const,
    label: 'Wink',
    icon: '😉',
    description: 'A subtle wink and smile',
  },
  {
    id: 'clap' as const,
    label: 'Clap',
    icon: '👏',
    description: 'A small realistic clap',
  },
  {
    id: 'nod' as const,
    label: 'Nod',
    icon: '🙂',
    description: 'A gentle head nod',
  },
] as const;

export type MotionStyle = typeof MOTION_STYLES[number]['id'];

const PROMPT_BASE =
  'Animate ONLY the person(s) present in the uploaded image. Keep facial identity, features, skin tone, hair, and clothing exactly as in the original — no morphing, no distortion, no face swap. Camera must remain perfectly stable: no zoom, no pan, no crop, no reframing. Preserve original composition, proportions, and background unchanged. DO NOT add new people, faces, objects, or background elements. DO NOT extend the image beyond its original boundaries. Motion must be subtle, realistic, and physically believable, contained within the original frame. Produce a smooth 5-second clip that loops seamlessly (start and end states should match closely). If MULTIPLE people are present, EVERY person must perform the action independently and simultaneously — none stay still — without merging or syncing unnaturally.';

const MOUTH_CLOSED =
  'CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, lips do not move as if forming words.';

export const MOTION_PROMPTS: Record<MotionStyle, string> = {
  wave: `${PROMPT_BASE} ACTION — WAVE: The person raises one hand to head/shoulder height in front of the body and clearly moves the hand side to side (right and left, back and forth) like a real waving gesture, repeating the side-to-side motion 2–3 times across the 5 seconds. Add a soft natural closed-mouth smile. ${MOUTH_CLOSED}`,
  smile: `${PROMPT_BASE} ACTION — SMILE: Apply a subtle, natural, warm smile with minimal facial movement. Only a gentle closed-mouth or softly parted smile that grows slightly and holds. ${MOUTH_CLOSED}`,
  dance: `${PROMPT_BASE} ACTION — DANCE: The person performs a small, playful dance in place — gentle shoulder sway and subtle side-to-side hip/torso movement to a cheerful rhythm, with relaxed arm motion. Keep feet roughly planted; no large displacement. Add a light closed-mouth smile. Movement should feel joyful but contained. ${MOUTH_CLOSED}`,
  thumbs_up: `${PROMPT_BASE} ACTION — THUMBS UP: The person raises one hand into frame at chest height and gives a clear, confident thumbs-up gesture, holding it briefly, with a friendly closed-mouth smile. The thumbs-up must be clearly visible and recognizable. ${MOUTH_CLOSED}`,
  celebrate: `${PROMPT_BASE} ACTION — CELEBRATE: The person performs a cheerful celebration — both arms raised upward or outward in a joyful gesture (like a small "yay"), with a happy expression and a closed-mouth or softly smiling face. Slight head tilt is okay. Keep movement smooth and contained within the frame. ${MOUTH_CLOSED}`,
  laugh: `${PROMPT_BASE} ACTION — LAUGH: The person gives a genuine, happy laugh — natural smile that widens, light shoulder shake, subtle head movement. Mouth may open slightly as in real laughter, but the person is NOT speaking and forms NO words; lips do not shape syllables. Expression must look authentic and warm.`,
};

export const STATUS_STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'generating_video', label: 'Generating motion' },
  { key: 'finalizing', label: 'Finalizing greeting' },
  { key: 'ready', label: 'Ready!' },
] as const;
