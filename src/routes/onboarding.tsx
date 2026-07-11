import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, GlobeHemisphereWest } from '@phosphor-icons/react';

import { AuthBackground, type BlobSpec } from '@/components/auth/AuthBackground';
import { AuthIconGradientDefs } from '@/components/auth/AuthIconGradientDefs';
import { PrimaryButton } from '@/components/auth/PrimaryButton';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingScreen,
});

/* Port of WordAround/Features/Onboarding/Views/OnboardingView.swift. */

const BLOBS: BlobSpec[] = [
  { color: '#F2DBA1', width: 270, height: 315, rotation: 14, x: 195, y: -330 },
  { color: '#F2DBA1', width: 270, height: 330, rotation: -18, x: -200, y: 360 },
  { color: '#EBD1DE', width: 120, height: 135, rotation: 22, x: -175, y: -40, opacity: 0.55 },
  { color: '#D4DEF5', width: 125, height: 140, rotation: -18, x: -185, y: 245, opacity: 0.55 },
  { color: '#D1E3D9', width: 145, height: 155, rotation: 16, x: 180, y: 305, opacity: 0.6 },
  { color: '#FAC7D1', width: 95, height: 110, rotation: -8, x: 170, y: -55, opacity: 0.32 },
  { color: '#C7E3F7', width: 105, height: 115, rotation: 28, x: -150, y: 120, opacity: 0.35 },
  { color: '#D1EDD1', width: 110, height: 120, rotation: -24, x: 120, y: 160, opacity: 0.28 },
];

/* Orbiting greeting capsules — text tilts with the orbit, exactly like iOS. */
const GREETINGS = [
  { text: 'Hello', color: '#408FF7', angle: -18 },
  { text: 'Hola', color: '#FABD45', angle: 52 },
  { text: 'Bonjour', color: '#F28AA8', angle: 126 },
  { text: '你好', color: '#6BC794', angle: 198 },
  { text: 'नमस्ते', color: '#8CA1F7', angle: 272 },
];

function OnboardingScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleStart = () => {
    localStorage.setItem('wa.onboarded', '1');
    void navigate({ to: '/auth' });
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#F5F5FB]">
      <AuthIconGradientDefs />
      <AuthBackground blobs={BLOBS} />

      <div className="relative flex min-h-dvh flex-col items-center px-6">
        <div className="h-[105px] shrink-0" />

        {/* Hero: concentric circles + orbiting greetings + spinning globe */}
        <div className="relative flex h-80 w-80 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#E8EFFB] opacity-[0.78]" />
          <div className="absolute inset-[41px] rounded-full bg-[#F2F5FC]" />
          <div className="absolute inset-[26px] rounded-full border-[18px] border-white/55" />
          <div className="absolute inset-[14px] rounded-full border border-[#E3EBF7]" />

          <div
            className="absolute inset-0"
            style={{ animation: 'wa-spin 18s linear infinite' }}
          >
            {GREETINGS.map((item) => (
              <span
                key={item.text}
                className="absolute top-1/2 left-1/2 rounded-full border bg-white/72 px-3.5 py-2 text-[18px] font-semibold whitespace-nowrap"
                style={{
                  color: item.color,
                  borderColor: `${item.color}2E`,
                  boxShadow: `0 4px 8px ${item.color}1F`,
                  transform: `translate(-50%, -50%) rotate(${item.angle}deg) translateY(-132px)`,
                }}
              >
                {item.text}
              </span>
            ))}
          </div>

          {/* Globe Ø150 — static disc, glyph spins 0→-360° over 10s */}
          <div className="relative h-[150px] w-[150px]">
            <div
              className="absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_8px_14px_rgba(0,0,0,0.06)]"
              style={{
                background:
                  'radial-gradient(circle at 35% 28%, #ffffff 3%, #F5F7FC 55%, #E8EEF7 100%)',
              }}
            />
            <div
              className="absolute rounded-full blur-[2px]"
              style={{
                width: 123,
                height: 102,
                left: 5.5,
                top: 4,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.08))',
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ animation: 'wa-spin-reverse 10s linear infinite' }}
            >
              <GlobeHemisphereWest size={106} weight="fill" className="auth-icon-gradient" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <h1 className="text-[40px] font-bold text-(--color-auth-title)">{t('app.name')}</h1>
          <p className="text-[18px] leading-[1.3] font-semibold whitespace-pre-line text-(--color-auth-subtitle)">
            {t('onboarding.subtitle')}
          </p>
        </div>

        <PrimaryButton
          type="button"
          onClick={handleStart}
          className="mt-6 h-[78px] w-[305px] gap-4 text-[24px] shadow-[0_12px_18px_rgba(48,145,247,0.24)]"
        >
          {t('onboarding.start')}
          <ArrowRight size={24} weight="bold" />
        </PrimaryButton>

        <div className="min-h-10 grow" />
      </div>
    </main>
  );
}
