import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import '@/lib/i18n';
import { AuthField } from './AuthField';

describe('AuthField', () => {
  it('renders label and placeholder wired to the input', () => {
    render(
      <AuthField label="Email" icon="envelope" type="email" placeholder="Enter your email" />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('placeholder', 'Enter your email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('toggles password visibility with the eye button', async () => {
    const user = userEvent.setup();
    render(
      <AuthField
        label="Password"
        icon="lock"
        type="password"
        placeholder="Enter your password"
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows a validation error below the field', () => {
    render(
      <AuthField
        label="Email"
        icon="envelope"
        type="email"
        placeholder="Enter your email"
        error="Enter a valid email"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });
});
