import { useEffect, useMemo, useState } from 'react';
import {
  getCreatorStats,
  getStoredUser,
  isAuthenticated,
  saveStoredSessionUser
} from '../../../services/authService';
import {
  getRoutesByUserId,
  getUserById,
  updateRouteById,
  updateUserById,
  type UpdateRoutePayload
} from '../../../services/profileService';
import { routeDataProvider } from '../../../services/routeService';
import type { AuthUser } from '../../../types/auth';
import type { Route } from '../../../types/route';
import TopNav from '../../shared/TopNav';
import Achievements from './Achievements';

interface ProfilePageProps {
  onNavigate: (path: string) => void;
}

interface UserFormState {
  name: string;
  surname: string;
  username: string;
  email: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface RouteFormState {
  name: string;
  description: string;
  cover_image: string;
  difficulty: 'easy' | 'medium' | 'hard';
  city: string;
  country: string;
  distance: string;
  duration: string;
  tagsText: string;
}

interface CreatorStats {
  routesCreated: number;
  pointsCreated: number;
}

const createUserFormState = (user: AuthUser): UserFormState => ({
  name: user.name ?? '',
  surname: user.surname ?? '',
  username: user.username ?? '',
  email: user.email ?? '',
  newPassword: '',
  confirmNewPassword: ''
});

const createRouteFormState = (route: Route): RouteFormState => ({
  name: route.name ?? '',
  description: route.description ?? '',
  cover_image: route.cover_image ?? '',
  difficulty: route.difficulty,
  city: route.city ?? '',
  country: route.country ?? '',
  distance: route.distance != null ? String(route.distance) : '',
  duration: route.duration != null ? String(route.duration) : '',
  tagsText: route.tags.join(', ')
});

const parseCommaSeparatedValues = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getRoutePreviewImage = (route: Route): string => {
  if (route.cover_image && route.cover_image.trim().length > 0) {
    return route.cover_image;
  }

  if ((route.images ?? []).length > 0 && route.images[0].trim().length > 0) {
    return route.images[0];
  }

  return '';
};

function ProfilePage({ onNavigate }: ProfilePageProps) {
  const sessionUser = useMemo(() => getStoredUser(), []);

  const [user, setUser] = useState<AuthUser | null>(sessionUser);
  const [userForm, setUserForm] = useState<UserFormState>(
    sessionUser
      ? createUserFormState(sessionUser)
      : {
          name: '',
          surname: '',
          username: '',
          email: '',
          newPassword: '',
          confirmNewPassword: ''
        }
  );

  const [routes, setRoutes] = useState<Route[]>([]);
  const [creatorStats, setCreatorStats] = useState<CreatorStats>({
    routesCreated: 0,
    pointsCreated: 0
  });

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [editingUser, setEditingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userMessage, setUserMessage] = useState('');

  const [editingRouteId, setEditingRouteId] = useState('');
  const [routeForm, setRouteForm] = useState<RouteFormState | null>(null);
  const [savingRoute, setSavingRoute] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState('');
  const [routeMessage, setRouteMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated() || !sessionUser?._id) {
      onNavigate('/login');
      return;
    }

    let mounted = true;

    const loadProfileData = async (): Promise<void> => {
      try {
        setLoading(true);
        setPageError('');

        const [userData, userRoutes, stats] = await Promise.all([
          getUserById(sessionUser._id),
          getRoutesByUserId(sessionUser._id),
          getCreatorStats()
        ]);

        if (!mounted) return;

        setUser(userData);
        setUserForm(createUserFormState(userData));
        setRoutes(userRoutes);
        setCreatorStats(stats);
      } catch (error) {
        if (!mounted) return;

        setPageError(error instanceof Error ? error.message : 'Unable to load the profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadProfileData();

    return () => {
      mounted = false;
    };
  }, [onNavigate, sessionUser]);

  const handleUserFieldChange = (field: keyof UserFormState, value: string): void => {
    setUserForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const resetUserForm = (): void => {
    if (!user) return;

    setUserForm(createUserFormState(user));
    setUserMessage('');
  };

  const handleSaveUser = async (): Promise<void> => {
    if (!user?._id) return;

    const wantsPasswordChange =
      userForm.newPassword.trim().length > 0 ||
      userForm.confirmNewPassword.trim().length > 0;

    if (wantsPasswordChange) {
      if (!userForm.newPassword.trim() || !userForm.confirmNewPassword.trim()) {
        setUserMessage('To change the password, fill in both password fields.');
        return;
      }

      if (userForm.newPassword !== userForm.confirmNewPassword) {
        setUserMessage('The new passwords do not match.');
        return;
      }

      if (userForm.newPassword.length < 6) {
        setUserMessage('The new password must contain at least 6 characters.');
        return;
      }
    }

    setSavingUser(true);
    setUserMessage('');

    try {
      const payload: {
        name: string;
        surname: string;
        username: string;
        email: string;
        password?: string;
        enabled: boolean;
        role: string;
      } = {
        name: userForm.name.trim(),
        surname: userForm.surname.trim(),
        username: userForm.username.trim(),
        email: userForm.email.trim(),
        enabled: user.enabled ?? true,
        role: user.role ?? 'user'
      };

      if (wantsPasswordChange) {
        payload.password = userForm.newPassword;
      }

      const updatedUser = await updateUserById(user._id, payload);

      setUser(updatedUser);
      saveStoredSessionUser(updatedUser);
      setEditingUser(false);
      setUserForm(createUserFormState(updatedUser));
      setUserMessage(
        wantsPasswordChange
          ? 'Profile and password updated successfully.'
          : 'Profile updated successfully.'
      );
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : 'Unable to save the profile.');
    } finally {
      setSavingUser(false);
    }
  };

  const startEditingRoute = (route: Route): void => {
    setEditingRouteId(route._id);
    setRouteForm(createRouteFormState(route));
    setRouteMessage('');
  };

  const cancelRouteEdit = (): void => {
    setEditingRouteId('');
    setRouteForm(null);
    setRouteMessage('');
  };

  const handleRouteFieldChange = (field: keyof RouteFormState, value: string): void => {
    setRouteForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSaveRoute = async (originalRoute: Route): Promise<void> => {
    if (!routeForm) return;

    setSavingRoute(true);
    setRouteMessage('');

    try {
      const coverImage = routeForm.cover_image.trim();

      const payload: UpdateRoutePayload = {
        name: routeForm.name.trim(),
        description: routeForm.description.trim(),
        cover_image: coverImage,
        images: coverImage
          ? [
              coverImage,
              ...(originalRoute.images ?? []).filter((image) => image !== coverImage)
            ]
          : originalRoute.images ?? [],
        difficulty: routeForm.difficulty,
        city: routeForm.city.trim(),
        country: routeForm.country.trim(),
        distance: routeForm.distance.trim() ? Number(routeForm.distance) : undefined,
        duration: routeForm.duration.trim() ? Number(routeForm.duration) : undefined,
        tags: parseCommaSeparatedValues(routeForm.tagsText)
      };

      const updatedRoute = await updateRouteById(originalRoute._id, payload);

      setRoutes((prev) =>
        prev.map((route) => (route._id === updatedRoute._id ? updatedRoute : route))
      );

      setEditingRouteId('');
      setRouteForm(null);
      setRouteMessage('Route updated successfully.');
    } catch (error) {
      setRouteMessage(error instanceof Error ? error.message : 'Unable to save the route.');
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (route: Route): Promise<void> => {
    const confirmed = window.confirm(`Delete route "${route.name}"? This action cannot be undone.`);

    if (!confirmed) return;

    setDeletingRouteId(route._id);
    setRouteMessage('');

    try {
      await routeDataProvider.deleteRoute(route._id);
      setRoutes((prev) => prev.filter((item) => item._id !== route._id));
      setCreatorStats((prev) => ({
        ...prev,
        routesCreated: Math.max(prev.routesCreated - 1, 0)
      }));
      setRouteMessage('Route deleted successfully.');

      if (editingRouteId === route._id) {
        setEditingRouteId('');
        setRouteForm(null);
      }
    } catch (error) {
      setRouteMessage(error instanceof Error ? error.message : 'Unable to delete the route.');
    } finally {
      setDeletingRouteId('');
    }
  };

  if (loading) {
    return (
      <>
        <TopNav activeTopNav="home" />
        <main className="profile-page">
          <div className="profile-shell">
            <p className="profile-loading">Loading profile...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <TopNav activeTopNav="home" />
        <main className="profile-page">
          <div className="profile-shell">
            <p className="profile-error">User session not found.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav activeTopNav="home" />

      <main className="profile-page">
        <div className="profile-shell">
          <div className="profile-header">
            <div>
              <h1 className="profile-title">My profile</h1>
              <p className="profile-subtitle">View and edit your account information and routes.</p>
            </div>
          </div>

          {pageError ? <div className="profile-error">{pageError}</div> : null}

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Account information</h2>

              {!editingUser ? (
                <button className="profile-btn-primary" onClick={() => setEditingUser(true)}>
                  Edit profile
                </button>
              ) : (
                <div className="profile-actions-inline">
                  <button
                    className="profile-btn-secondary"
                    onClick={() => {
                      setEditingUser(false);
                      resetUserForm();
                    }}
                    disabled={savingUser}
                  >
                    Cancel
                  </button>

                  <button
                    className="profile-btn-primary"
                    onClick={() => {
                      void handleSaveUser();
                    }}
                    disabled={savingUser}
                  >
                    {savingUser ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              )}
            </div>

            {userMessage ? <p className="profile-message">{userMessage}</p> : null}

            {!editingUser ? (
              <div className="profile-info-grid">
                <div>
                  <span className="profile-label">Name</span>
                  <strong>{user.name || '-'}</strong>
                </div>
                <div>
                  <span className="profile-label">Surname</span>
                  <strong>{user.surname || '-'}</strong>
                </div>
                <div>
                  <span className="profile-label">Username</span>
                  <strong>{user.username || '-'}</strong>
                </div>
                <div>
                  <span className="profile-label">Email</span>
                  <strong>{user.email || '-'}</strong>
                </div>
                <div>
                  <span className="profile-label">Password</span>
                  <strong>••••••••</strong>
                </div>
              </div>
            ) : (
              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>Name</span>
                  <input
                    value={userForm.name}
                    onChange={(event) => handleUserFieldChange('name', event.target.value)}
                  />
                </label>

                <label className="profile-field">
                  <span>Surname</span>
                  <input
                    value={userForm.surname}
                    onChange={(event) => handleUserFieldChange('surname', event.target.value)}
                  />
                </label>

                <label className="profile-field">
                  <span>Username</span>
                  <input
                    value={userForm.username}
                    onChange={(event) => handleUserFieldChange('username', event.target.value)}
                  />
                </label>

                <label className="profile-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(event) => handleUserFieldChange('email', event.target.value)}
                  />
                </label>

                <label className="profile-field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={userForm.newPassword}
                    onChange={(event) => handleUserFieldChange('newPassword', event.target.value)}
                  />
                </label>

                <label className="profile-field">
                  <span>Confirm new password</span>
                  <input
                    type="password"
                    value={userForm.confirmNewPassword}
                    onChange={(event) =>
                      handleUserFieldChange('confirmNewPassword', event.target.value)
                    }
                  />
                </label>
              </div>
            )}
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>Creator statistics</h2>
            </div>

            <div className="profile-info-grid">
              <div>
                <span className="profile-label">Routes created</span>
                <strong>{creatorStats.routesCreated}</strong>
              </div>

              <div>
                <span className="profile-label">Points created</span>
                <strong>{creatorStats.pointsCreated}</strong>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <Achievements />
          </section>

          <section className="profile-card">
            <div className="profile-card-header">
              <h2>My published routes</h2>
            </div>

            {routeMessage ? <p className="profile-message">{routeMessage}</p> : null}

            {routes.length === 0 ? (
              <p className="profile-empty">You have not published any routes yet.</p>
            ) : (
              <div className="profile-routes-list">
                {routes.map((route) => {
                  const isEditingThisRoute = editingRouteId === route._id && routeForm;
                  const previewImage = getRoutePreviewImage(route);

                  return (
                    <article className="profile-route-card" key={route._id}>
                      {!isEditingThisRoute ? (
                        <div className="profile-route-preview-layout">
                          <div className="profile-route-image-wrap">
                            {previewImage ? (
                              <img src={previewImage} alt={route.name} />
                            ) : (
                              <div className="profile-route-image-placeholder">No image</div>
                            )}
                          </div>

                          <div className="profile-route-content">
                            <div className="profile-route-header">
                              <div>
                                <h3>{route.name}</h3>
                                <p>
                                  {route.city}, {route.country}
                                </p>
                              </div>

                              <div className="profile-actions-inline">
                                <button
                                  className="profile-btn-secondary"
                                  onClick={() => {
                                    void handleDeleteRoute(route);
                                  }}
                                  disabled={deletingRouteId === route._id}
                                >
                                  {deletingRouteId === route._id ? 'Deleting...' : 'Delete route'}
                                </button>

                                <button
                                  className="profile-btn-primary"
                                  onClick={() => startEditingRoute(route)}
                                  disabled={deletingRouteId === route._id}
                                >
                                  Edit route
                                </button>
                              </div>
                            </div>

                            <div className="profile-route-meta">
                              <span>Difficulty: {route.difficulty}</span>
                              <span>Distance: {route.distance ?? '-'} km</span>
                              <span>Duration: {route.duration ?? '-'} min</span>
                            </div>

                            <p className="profile-route-description">{route.description}</p>

                            <div className="profile-tag-list">
                              {route.tags.map((tag) => (
                                <span key={`${route._id}-${tag}`} className="profile-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="profile-route-header">
                            <h3>Editing route</h3>

                            <div className="profile-actions-inline">
                              <button
                                className="profile-btn-secondary"
                                onClick={cancelRouteEdit}
                                disabled={savingRoute}
                              >
                                Cancel
                              </button>

                              <button
                                className="profile-btn-primary"
                                onClick={() => {
                                  void handleSaveRoute(route);
                                }}
                                disabled={savingRoute}
                              >
                                {savingRoute ? 'Saving...' : 'Save route'}
                              </button>
                            </div>
                          </div>

                          <div className="profile-route-edit-layout">
                            <div className="profile-route-edit-preview">
                              {routeForm.cover_image.trim().length > 0 ? (
                                <img
                                  src={routeForm.cover_image}
                                  alt={routeForm.name || 'Route cover'}
                                />
                              ) : (
                                <div className="profile-route-image-placeholder">
                                  No cover image
                                </div>
                              )}
                            </div>

                            <div className="profile-form-grid">
                              <label className="profile-field">
                                <span>Name</span>
                                <input
                                  value={routeForm.name}
                                  onChange={(event) =>
                                    handleRouteFieldChange('name', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field">
                                <span>Difficulty</span>
                                <select
                                  value={routeForm.difficulty}
                                  onChange={(event) =>
                                    handleRouteFieldChange(
                                      'difficulty',
                                      event.target.value as 'easy' | 'medium' | 'hard'
                                    )
                                  }
                                >
                                  <option value="easy">easy</option>
                                  <option value="medium">medium</option>
                                  <option value="hard">hard</option>
                                </select>
                              </label>

                              <label className="profile-field">
                                <span>City</span>
                                <input
                                  value={routeForm.city}
                                  onChange={(event) =>
                                    handleRouteFieldChange('city', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field">
                                <span>Country</span>
                                <input
                                  value={routeForm.country}
                                  onChange={(event) =>
                                    handleRouteFieldChange('country', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field">
                                <span>Distance</span>
                                <input
                                  type="number"
                                  value={routeForm.distance}
                                  onChange={(event) =>
                                    handleRouteFieldChange('distance', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field">
                                <span>Duration</span>
                                <input
                                  type="number"
                                  value={routeForm.duration}
                                  onChange={(event) =>
                                    handleRouteFieldChange('duration', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field profile-field-full">
                                <span>Description</span>
                                <textarea
                                  rows={4}
                                  value={routeForm.description}
                                  onChange={(event) =>
                                    handleRouteFieldChange('description', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field profile-field-full">
                                <span>Cover image URL</span>
                                <input
                                  value={routeForm.cover_image}
                                  onChange={(event) =>
                                    handleRouteFieldChange('cover_image', event.target.value)
                                  }
                                />
                              </label>

                              <label className="profile-field profile-field-full">
                                <span>Tags comma separated</span>
                                <input
                                  value={routeForm.tagsText}
                                  onChange={(event) =>
                                    handleRouteFieldChange('tagsText', event.target.value)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default ProfilePage;