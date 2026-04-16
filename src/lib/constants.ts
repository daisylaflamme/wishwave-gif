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
  wave: `Animate ONLY the person(s) present in the uploaded image. If the image is a headshot or portrait: show a natural hand wave in front of the body (visible in frame if possible), keep motion subtle, friendly, and realistic, add a soft natural smile. If multiple people are present: each person independently performs a small natural wave, do NOT merge people or synchronize unnaturally. STRICT RULES: DO NOT add new people, faces, or background elements. DO NOT change framing, zoom, or camera angle. DO NOT extend the image beyond original boundaries. Preserve original composition, proportions, and identity exactly. No extra limbs, no distortion. Motion must stay within the original image frame and look stable and believable.`,
  smile: `Animate ONLY the person(s) present in the uploaded image. If headshot: apply a subtle natural smile with minimal facial movement. If multiple people: each person smiles independently and naturally. STRICT RULES: DO NOT add new people or modify background. DO NOT change framing or camera. Preserve identity, proportions, and exact layout. No morphing or blending of faces. Motion must be minimal, stable, and realistic within the original frame.`,
  nod: `Animate ONLY the person(s) present in the uploaded image. If headshot: apply a gentle, friendly nod with a slight smile. If multiple people: each person nods independently. STRICT RULES: DO NOT generate new people or elements. DO NOT move or crop the camera. Preserve exact identity and composition. Avoid distortion or exaggerated movement. Motion must remain subtle and contained within the original image.`,
};

export const STATIC_AUDIO_PATH = "/assets/audio/happy-birthday.m4a";

export const STATUS_STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'generating_video', label: 'Generating motion' },
  { key: 'finalizing', label: 'Finalizing greeting' },
  { key: 'ready', label: 'Ready!' },
] as const;
