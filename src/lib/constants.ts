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
  wave: `Animate ONLY the person(s) present in the uploaded image. WAVE MOTION: The person must raise one hand up to head/shoulder height in front of the body and clearly move the hand from side to side (right and left, back and forth) like a real waving gesture — repeat the side-to-side hand motion 2-3 times during the clip so it is clearly recognizable as a wave. Add a soft natural smile. CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, NOT moving lips. No lip movement at all. If MULTIPLE people are present in the image: EVERY single person in the image must perform the wave independently at the same time — none of them stay still, all of them wave. Do NOT merge people or synchronize unnaturally, but all must be waving. STRICT RULES: DO NOT add new people, faces, or background elements. DO NOT change framing, zoom, or camera angle. DO NOT extend the image beyond original boundaries. Preserve original composition, proportions, and identity exactly. No extra limbs, no distortion. Motion must stay within the original image frame and look stable and believable.`,
  smile: `Animate ONLY the person(s) present in the uploaded image. Apply a subtle natural smile with minimal facial movement. CRITICAL: The mouth MUST NOT open to talk — the person is NOT speaking, NOT talking, lips do not move as if forming words. Only a gentle closed-mouth or softly parted smile. If MULTIPLE people are present: EVERY single person in the image must smile independently at the same time — all of them, none stay neutral. STRICT RULES: DO NOT add new people or modify background. DO NOT change framing or camera. Preserve identity, proportions, and exact layout. No morphing or blending of faces. Motion must be minimal, stable, and realistic within the original frame.`,
  nod: `Animate ONLY the person(s) present in the uploaded image. Apply a gentle, friendly head nod (small up-and-down head movement) with a slight closed-mouth smile. CRITICAL: The mouth MUST stay closed and still — the person is NOT talking, NOT speaking, no lip movement, no words being formed. If MULTIPLE people are present: EVERY single person in the image must nod independently at the same time — all of them, none stay still. STRICT RULES: DO NOT generate new people or elements. DO NOT move or crop the camera. Preserve exact identity and composition. Avoid distortion or exaggerated movement. Motion must remain subtle and contained within the original image.`,
};

export const STATIC_AUDIO_PATH = "/assets/audio/happy-birthday.m4a";

export const STATUS_STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'generating_video', label: 'Generating motion' },
  { key: 'finalizing', label: 'Finalizing greeting' },
  { key: 'ready', label: 'Ready!' },
] as const;
