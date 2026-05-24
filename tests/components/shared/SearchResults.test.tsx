import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoute } from '../../test/routeFactory';
import SearchResults from '../../../src/components/shared/SearchResults';

const mocks = vi.hoisted(() => ({
  toggleFavoriteRouteByUserId: vi.fn(),
  saveStoredSessionUser: vi.fn()
}));

vi.mock('../../../src/services/authService', () => ({
  getStoredUser: () => ({
    _id: 'user-1',
    name: 'Judit',
    surname: 'Test',
    username: 'judit',
    email: 'judit@example.com',
    favoriteRoutes: ['route-1']
  }),
  isAuthenticated: () => true,
  saveStoredSessionUser: mocks.saveStoredSessionUser
}));

vi.mock('../../../src/services/profileService', () => ({
  toggleFavoriteRouteByUserId: mocks.toggleFavoriteRouteByUserId
}));

describe('SearchResults', () => {
  beforeEach(() => {
    mocks.toggleFavoriteRouteByUserId.mockReset();
    mocks.saveStoredSessionUser.mockReset();
  });

  it('renders route cards, pagination and page size controls', async () => {
    const user = userEvent.setup();
    const onPreviousPage = vi.fn();
    const onNextPage = vi.fn();
    const onPageSizeChange = vi.fn();
    const routes = [
      createRoute({ _id: 'route-1', name: 'Gothic Quarter Walk' }),
      createRoute({ _id: 'route-2', name: 'Beach Morning Route', difficulty: 'medium' })
    ];

    render(
      <SearchResults
        routes={routes}
        totalResults={12}
        currentPage={1}
        pageSize={10}
        totalPages={2}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByText('Showing 1-10 of 12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /gothic quarter walk/i })).toHaveAttribute(
      'href',
      '/route.html?id=route-1'
    );
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.selectOptions(screen.getByLabelText(/show/i), '25');

    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('updates favorite state and stored user after toggling a route', async () => {
    const user = userEvent.setup();
    mocks.toggleFavoriteRouteByUserId.mockResolvedValue([
      createRoute({ _id: 'route-2', name: 'Beach Morning Route' })
    ]);

    render(
      <SearchResults
        routes={[createRoute({ _id: 'route-1' })]}
        totalResults={1}
        currentPage={1}
        pageSize={10}
        totalPages={1}
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /remove from favorites/i }));

    await waitFor(() => {
      expect(mocks.toggleFavoriteRouteByUserId).toHaveBeenCalledWith('user-1', 'route-1');
      expect(mocks.saveStoredSessionUser).toHaveBeenCalledWith(
        expect.objectContaining({ favoriteRoutes: ['route-2'] })
      );
    });
  });

  it('shows an empty state when there are no routes', () => {
    render(
      <SearchResults
        routes={[]}
        totalResults={0}
        currentPage={1}
        pageSize={10}
        totalPages={1}
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(screen.getByText('No matching routes found.')).toBeInTheDocument();
  });
});
