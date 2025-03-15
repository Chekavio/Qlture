export const calculateLevelFromXP = (xp: number): number => {
  // Simple level calculation: level = floor(sqrt(xp/100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const calculateXPForNextLevel = (currentLevel: number): number => {
  // XP needed for next level = (level)^2 * 100
  return Math.pow(currentLevel, 2) * 100;
};

export const generateRandomMission = (userLevel: number) => {
  const baseXP = userLevel * 100;
  const randomFactor = Math.random() * 0.5 + 0.75; // Random factor between 0.75 and 1.25

  return {
    xpReward: Math.floor(baseXP * randomFactor),
    difficulty: userLevel,
  };
};

export const formatError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return JSON.stringify(error);
};
