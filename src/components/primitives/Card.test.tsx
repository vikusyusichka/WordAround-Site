import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders children with default radius+surface classes', () => {
    render(<Card data-testid="card">Hello</Card>);
    const el = screen.getByTestId('card');
    expect(el).toHaveTextContent('Hello');
    expect(el.className).toContain('rounded-(--radius-card)');
    expect(el.className).toContain('bg-(--color-card-white)');
  });

  it('applies the requested radius variant', () => {
    render(
      <Card data-testid="card" radius="stat" surface="goal-bg">
        stats
      </Card>,
    );
    const el = screen.getByTestId('card');
    expect(el.className).toContain('rounded-(--radius-stat-card)');
    expect(el.className).toContain('bg-(--color-goal-bg)');
  });
});
