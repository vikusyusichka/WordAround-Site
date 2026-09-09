/* The switch on the notification cards — the web stand-in for SwiftUI's
   Toggle. A real checkbox input underneath (so it is focusable, keyboard
   operable and announced as a switch), with the track and knob drawn on top by
   the sibling span. */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export const ToggleSwitch = ({ checked, onChange, label, disabled = false }: ToggleSwitchProps) => (
  <span className="relative inline-flex shrink-0">
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="peer size-full absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
    <span
      aria-hidden
      className="block h-[30px] w-[50px] rounded-full bg-(--color-auth-field-border) transition-colors peer-checked:bg-(--color-primary-blue) peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-(--color-home-brand) peer-focus-visible:ring-offset-2"
    />
    <span
      aria-hidden
      className="pointer-events-none absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-5"
    />
  </span>
);
