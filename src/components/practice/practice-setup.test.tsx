import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OptionPill, OptionPillGroup } from './OptionPill';
import { SetupSection } from './SetupSection';

describe('OptionPill', () => {
  it('reflects selected state via aria-pressed and fills solid accent', () => {
    render(<OptionPill label="Short" selected accent="#3CCF91" onClick={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Short' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.style.background).toBe('rgb(60, 207, 145)');
    expect(btn.style.color).toBe('rgb(255, 255, 255)');
  });

  it('selected pill carries an accent glow shadow', () => {
    render(<OptionPill label="X" selected accent="#3CCF91" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'X' }).style.boxShadow).toContain('color-mix');
  });

  it('unselected uses a translucent fill, not solid accent', () => {
    render(<OptionPill label="Long" selected={false} accent="#3CCF91" onClick={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Long' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn.style.background).toContain('color-mix');
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<OptionPill label="Go" selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('OptionPillGroup', () => {
  it('marks exactly the selected option pressed and reports changes', () => {
    const onChange = vi.fn();
    render(
      <OptionPillGroup
        options={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
        ]}
        value="b"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });
});

describe('SetupSection', () => {
  it('renders a heading, optional subtitle/helper and its children', () => {
    render(
      <SetupSection title="Level" subtitle="Pick difficulty" helper="You can change later">
        <span>child</span>
      </SetupSection>,
    );
    expect(screen.getByRole('heading', { name: 'Level' })).toBeInTheDocument();
    expect(screen.getByText('Pick difficulty')).toBeInTheDocument();
    expect(screen.getByText('You can change later')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
