import { expect, type Page, test } from '@playwright/test';

const routes = [
  {
    _id: 'barcelona-gothic',
    name: 'Barcelona Gothic Walk',
    description: 'Historic route through the Gothic Quarter.',
    cover_image: '/resources/logos/logo.png',
    images: ['/resources/logos/logo.png'],
    userId: 'user-1',
    difficulty: 'easy',
    city: 'Barcelona',
    country: 'Spain',
    distance: 3,
    duration: 75,
    tags: ['history', 'city']
  },
  {
    _id: 'girona-walls',
    name: 'Girona Walls Route',
    description: 'A scenic route around the old city walls.',
    cover_image: '/resources/logos/logo.png',
    images: ['/resources/logos/logo.png'],
    userId: 'user-1',
    difficulty: 'medium',
    city: 'Girona',
    country: 'Spain',
    distance: 5,
    duration: 110,
    tags: ['views', 'history']
  },
  {
    _id: 'barcelona-beach',
    name: 'Barcelona Beach Morning',
    description: 'A relaxed walk by the sea.',
    cover_image: '/resources/logos/logo.png',
    images: ['/resources/logos/logo.png'],
    userId: 'user-1',
    difficulty: 'easy',
    city: 'Barcelona',
    country: 'Spain',
    distance: 4,
    duration: 60,
    tags: ['sea', 'morning']
  }
];

const manyRoutes = Array.from({ length: 12 }, (_, index) => ({
  _id: `route-${index + 1}`,
  name: `Route ${index + 1}`,
  description: `Description for route ${index + 1}.`,
  cover_image: '/resources/logos/logo.png',
  images: ['/resources/logos/logo.png'],
  userId: 'user-1',
  difficulty: index % 3 === 0 ? 'hard' : index % 2 === 0 ? 'medium' : 'easy',
  city: index === 11 ? 'Tarragona' : 'Barcelona',
  country: 'Spain',
  distance: index + 1,
  duration: 45 + index * 10,
  tags: ['city', 'walk']
}));

async function mockRoutes(page: Page, mockedRoutes = routes): Promise<void> {
  await page.route(/http:\/\/(localhost|127\.0\.0\.1):1337\/routes.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ routes: mockedRoutes, popularRouteIds: ['girona-walls'] })
    });
  });
}

test('loads the home page and filters routes from the search box', async ({ page }) => {
  await mockRoutes(page);
  await page.goto('/');

  await expect(page.getByPlaceholder('Where do you want to explore today?')).toBeVisible();
  await expect(page.getByText('Top 5 popular routes')).toBeVisible();

  await page.getByPlaceholder('Where do you want to explore today?').fill('girona');

  await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Girona Walls Route/i })).toBeVisible();
  await expect(page.getByText('Showing 1-1 of 1')).toBeVisible();
});

test('opens the route sort filter menu', async ({ page }) => {
  await mockRoutes(page);
  await page.goto('/');

  await page.getByPlaceholder('Where do you want to explore today?').fill('barcelona');
  await page.getByRole('button', { name: 'Filter results' }).click();

  await expect(page.getByRole('menu', { name: 'Sort options' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Distance ↑/ })).toBeVisible();
});

test('clears an active search and returns to home sections', async ({ page }) => {
  await mockRoutes(page);
  await page.goto('/');

  const searchInput = page.getByPlaceholder('Where do you want to explore today?');
  await searchInput.fill('girona');
  await expect(page.getByRole('heading', { name: 'Search results' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear search' }).click();

  await expect(searchInput).toHaveValue('');
  await expect(page.getByText('Top 5 popular routes')).toBeVisible();
});

test('shows route pagination on the routes page', async ({ page }) => {
  await mockRoutes(page, manyRoutes);

  await page.goto('/routes');

  await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible();
  await expect(page.getByText('Showing 1-10 of 12')).toBeVisible();
  await expect(page.locator('a[href="/route.html?id=route-1"]')).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Showing 11-12 of 12')).toBeVisible();
  await expect(page.locator('a[href="/route.html?id=route-12"]')).toBeVisible();
});

test('changes route page size on the routes page', async ({ page }) => {
  await mockRoutes(page, manyRoutes);

  await page.goto('/routes');

  await page.getByLabel('Show').selectOption('25');

  await expect(page.getByText('Showing 1-12 of 12')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});
