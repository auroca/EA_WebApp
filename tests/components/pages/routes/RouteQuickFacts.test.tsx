import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RouteQuickFacts from '../../../../src/components/pages/routes/RouteQuickFacts';

describe('RouteQuickFacts', () => {
  it('shows distance and duration when route data is available', () => {
    render(<RouteQuickFacts distance={12.5} duration={180} />);

    expect(screen.getByText('12.5 km')).toBeInTheDocument();
    expect(screen.getByText('180 min')).toBeInTheDocument();
  });

  it('shows fallback text when quick facts are missing', () => {
    render(<RouteQuickFacts />);

    expect(screen.getAllByText('Not specified')).toHaveLength(2);
  });
});
