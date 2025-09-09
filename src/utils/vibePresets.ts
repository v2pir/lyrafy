import { VibeMode } from "../types/music";

export const VIBE_PRESETS: VibeMode[] = [
  {
    id: "chill",
    name: "Chill",
    emoji: "😌",
    description: "Relaxed vibes for unwinding",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    id: "party",
    name: "Party",
    emoji: "🎉",
    description: "High energy tracks to get the party started",
    gradient: ["#ff6b6b", "#feca57"],
  },
  {
    id: "workout",
    name: "Workout",
    emoji: "💪",
    description: "Pump up tracks for your workout",
    gradient: ["#ff9a9e", "#fecfef"],
  },
  {
    id: "focus",
    name: "Focus",
    emoji: "🎯",
    description: "Concentration music for productivity",
    gradient: ["#a8edea", "#fed6e3"],
  },
  {
    id: "sad",
    name: "Sad",
    emoji: "😢",
    description: "Emotional tracks for when you need to feel",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    id: "happy",
    name: "Happy",
    emoji: "😊",
    description: "Upbeat songs to brighten your day",
    gradient: ["#ffecd2", "#fcb69f"],
  },
  {
    id: "romantic",
    name: "Romantic",
    emoji: "💕",
    description: "Love songs for special moments",
    gradient: ["#ff9a9e", "#fecfef"],
  },
  {
    id: "nostalgic",
    name: "Nostalgic",
    emoji: "🕰️",
    description: "Throwback tracks from the past",
    gradient: ["#a8edea", "#fed6e3"],
  },
];

export const getVibeModeById = (id: string): VibeMode | undefined => {
  return VIBE_PRESETS.find(vibe => vibe.id === id);
};

export const getRandomVibeMode = (): VibeMode => {
  const randomIndex = Math.floor(Math.random() * VIBE_PRESETS.length);
  return VIBE_PRESETS[randomIndex];
};
