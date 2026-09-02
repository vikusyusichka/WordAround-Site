/* Desktop-only brand half of the auth split screen: the onboarding hero
   (concentric discs, orbiting greetings, spinning globe) over the blob
   background, with the wordmark underneath. Hidden below lg, where the form
   takes the whole screen instead. */
import { useTranslation } from 'react-i18next';
import { GlobeHemisphereWest } from '@phosphor-icons/react';

import { AuthBackground, type BlobSpec } from '@/components/auth/AuthBackground';

const BLOBS: BlobSpec[] = [
  { color: '#F2DBA1', width: 300, height: 340, rotation: 14, x: 190, y: -300 },
  { color: '#F2DBA1', width: 296, height: 344, rotation: -18, x: -190, y: 320 },
  { color: '#EBD1DE', width: 132, height: 148, rotation: 22, x: -190, y: -60, opacity: 0.55 },
  { color: '#D1E3D9', width: 150, height: 162, rotation: 16, x: 185, y: 290, opacity: 0.6 },
  { color: '#D4DEF5', width: 128, height: 142, rotation: -18, x: -195, y: 130, opacity: 0.5 },
  { color: '#C7E3F7', width: 108, height: 118, rotation: 28, x: 175, y: 20, opacity: 0.32 },
];

/* Same five greetings the onboarding hero orbits, at the same angles. */
const GREETINGS = [
  { text: 'Hello', color: '#408FF7', angle: -18 },
  { text: 'Hola', color: '#FABD45', angle: 52 },
  { text: 'Bonjour', color: '#F28AA8', angle: 126 },
  { text: '你好', color: '#6BC794', angle: 198 },
  { text: 'नमस्ते', color: '#8CA1F7', angle: 272 },
];

export const AuthBrandPanel = () => {
  const { t } = useTranslation();

  return (
    <div
      className="relative hidden overflow-hidden lg:flex lg:w-[46%] lg:max-w-[700px] lg:min-w-[520px]"
      style={{
        background: 'linear-gradient(168deg, #EAF0FC 0%, #F5F5FB 58%, #F7F2E9 100%)',
      }}
    >
      <AuthBackground blobs={BLOBS} />

      <div className="relative flex w-full flex-col items-center justify-center gap-11 px-16">
        {/* Hero: concentric circles + orbiting greetings + spinning globe */}
        <div className="relative flex h-[360px] w-[360px] shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#E8EFFB] opacity-[0.78]" />
          <div className="absolute inset-[46px] rounded-full bg-[#F2F5FC]" />
          <div className="absolute inset-[29px] rounded-full border-[20px] border-white/55" />
          <div className="absolute inset-[16px] rounded-full border border-[#E3EBF7]" />

          <div className="absolute inset-0" style={{ animation: 'wa-spin 22s linear infinite' }}>
            {GREETINGS.map((item) => (
              <span
                key={item.text}
                className="absolute top-1/2 left-1/2 rounded-full border bg-white/72 px-3.5 py-2 text-[18px] font-semibold whitespace-nowrap"
                style={{
                  color: item.color,
                  borderColor: `${item.color}2E`,
                  boxShadow: `0 4px 8px ${item.color}1F`,
                  transform: `translate(-50%, -50%) rotate(${item.angle}deg) translateY(-149px)`,
                }}
              >
                {item.text}
              </span>
            ))}
          </div>

          <div className="relative h-[168px] w-[168px]">
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
                width: 138,
                height: 114,
                left: 6,
                top: 5,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.08))',
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ animation: 'wa-spin-reverse 12s linear infinite' }}
            >
              <GlobeHemisphereWest size={118} weight="fill" className="auth-icon-gradient" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3.5 text-center">
          <h1 className="text-[42px] font-bold tracking-[-0.5px] text-(--color-auth-title)">
            {t('app.name')}
          </h1>
          <p className="max-w-[340px] text-[19px] leading-[1.35] font-semibold whitespace-pre-line text-(--color-auth-subtitle)">
            {t('onboarding.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
};
