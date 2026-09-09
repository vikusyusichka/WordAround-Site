import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { OfflineBanner } from './OfflineBanner';

const setOnline = (value: boolean) => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value);
};

afterEach(() => vi.restoreAllMocks());

describe('OfflineBanner', () => {
  it('stays out of the way while there is a network', () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('appears when the browser goes offline and says what still works', () => {
    setOnline(true);
    render(<OfflineBanner />);

    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    /* The point of the wording: the library is still usable. */
    expect(banner.textContent).toMatch(/still open/i);
  });

  it('goes away again when the network comes back', () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
