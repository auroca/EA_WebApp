import type { Achievement } from '../types/achievement';
import { authenticatedFetch } from './apiClient';

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const data = await response.json();

    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
  } catch {
    // Keep the fallback message when the error payload cannot be parsed.
  }

  return fallback;
};

const mapAchievementFromApi = (payload: unknown): Achievement | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const achievement = payload as Record<string, unknown>;

  const normalized: Achievement = {
    _id: typeof achievement._id === 'string' ? achievement._id : '',
    code: typeof achievement.code === 'string' ? achievement.code : '',
    title: typeof achievement.title === 'string' ? achievement.title : '',
    description: typeof achievement.description === 'string' ? achievement.description : '',
    icon: typeof achievement.icon === 'string' ? achievement.icon : '',
    unlocked: typeof achievement.unlocked === 'boolean' ? achievement.unlocked : false,
    unlockedAt: typeof achievement.unlockedAt === 'string' ? achievement.unlockedAt : null
  };

  if (!normalized.code || !normalized.title) {
    return null;
  }

  return normalized;
};

const mapAchievementsFromApi = (payload: unknown): Achievement[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map(mapAchievementFromApi)
    .filter((achievement): achievement is Achievement => achievement !== null);
};

export const getMyAchievements = async (): Promise<Achievement[]> => {
  const response = await authenticatedFetch('/achievements/me');

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to load your achievements.'));
  }

  const data = await response.json();

  if (data && typeof data === 'object' && 'data' in data) {
    return mapAchievementsFromApi((data as { data: unknown }).data);
  }

  return mapAchievementsFromApi(data);
};