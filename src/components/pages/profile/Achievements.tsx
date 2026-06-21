import { useEffect, useState } from 'react';
import type { Achievement } from '../../../types/achievement';
import { getMyAchievements } from '../../../services/achievementService';
import { getStoredUser } from '../../../services/authService';
import { useLanguage } from '../../../i18n/LanguageContext';

const getSeenAchievementsKey = (): string => {
  const user = getStoredUser();
  return `seenAchievements:${user?._id ?? 'guest'}`;
};

const getSeenAchievementCodes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(getSeenAchievementsKey()) ?? '[]') as string[];
  } catch {
    return [];
  }
};

const saveSeenAchievementCodes = (codes: string[]): void => {
  localStorage.setItem(getSeenAchievementsKey(), JSON.stringify(codes));
  window.dispatchEvent(new Event('achievements-seen-updated'));
};

export default function Achievements() {
  const { t } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [seenCodes, setSeenCodes] = useState<string[]>(getSeenAchievementCodes);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyAchievements()
      .then((data) => {
        setAchievements(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('achievements.loadError'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAchievementClick = (achievement: Achievement): void => {
    if (selectedAchievement?.code === achievement.code) {
      setSelectedAchievement(null);
    } else {
      setSelectedAchievement(achievement);
    }

    if (!achievement.unlocked) {
      return;
    }

    if (!seenCodes.includes(achievement.code)) {
      const nextSeenCodes = [...seenCodes, achievement.code];
      setSeenCodes(nextSeenCodes);
      saveSeenAchievementCodes(nextSeenCodes);
    }
  };

  if (loading) return <p>{t('achievements.loading')}</p>;
  if (error) return <p>{error}</p>;

  const visibleAchievements = showAll
    ? achievements
    : achievements.filter((achievement) => achievement.unlocked);

  return (
    <section className="achievements">
      <div className="achievements-header">
        <h2>{t('achievements.title')}</h2>

        <button
          type="button"
          className="achievements-toggle-button"
          onClick={() => {
            setShowAll((prev) => !prev);
            setSelectedAchievement(null);
          }}
        >
          {showAll ? t('achievements.showUnlocked') : t('achievements.showAll')}
        </button>
      </div>

      {visibleAchievements.length === 0 ? (
        <p>{t('achievements.empty')}</p>
      ) : (
        <div className="achievements-list">
          {visibleAchievements.map((achievement) => (
            <button
              key={achievement.code}
              type="button"
              className={
                achievement.unlocked
                  ? 'achievement-pill'
                  : 'achievement-pill achievement-pill-locked'
              }
              onClick={() => handleAchievementClick(achievement)}
            >
              <span className="achievement-pill-icon">
                {achievement.unlocked ? achievement.icon : '🔒'}
              </span>
              <span>{achievement.title}</span>
              {achievement.unlocked && !seenCodes.includes(achievement.code) ? (
                <span className="new-achievement-badge">{t('nav.newAchievement')}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {selectedAchievement ? (
        <div className="achievement-detail">
          <h3>{selectedAchievement.title}</h3>
          <p>{selectedAchievement.description}</p>

          <small>
            {selectedAchievement.unlocked
              ? t('achievements.unlocked')
              : t('achievements.locked')}
          </small>
        </div>
      ) : null}
    </section>
  );
}
