/* Mobile radial create-menu — the signature "fan" kept for touch. A blurred
   backdrop plus the 5 create actions springing out onto an arc with a stagger
   (Motion). Actions are stubs until Phase 3. Desktop uses the CreateMenu
   dropdown instead. */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { CREATE_ITEMS } from '@/lib/createMenu';

const usePad = () => {
  const [isPad, setIsPad] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 700px)');
    const update = () => setIsPad(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isPad;
};

interface CreateMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (id: string) => void;
}

export const CreateMenuOverlay = ({ isOpen, onClose, onSelect }: CreateMenuOverlayProps) => {
  const { t } = useTranslation();
  const isPad = usePad();
  const spring = { type: 'spring' as const, stiffness: 90, damping: 18, mass: 1 };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 backdrop-blur-md lg:hidden"
          style={{ background: 'rgba(246,246,251,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute bottom-[132px] left-1/2">
            {CREATE_ITEMS.map((item) => {
              const x = isPad ? item.xPad : item.x;
              const y = isPad ? item.yPad : item.y;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[7px]"
                  style={{ width: isPad ? 100 : 78, height: isPad ? 112 : 86 }}
                  initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                  animate={{ x, y, scale: 1, opacity: 1 }}
                  exit={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                  transition={{ ...spring, delay: item.delay }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(item.id);
                    onClose();
                  }}
                >
                  <span className="grid size-[58px] place-items-center rounded-full bg-white/98 shadow-[0_7px_12px_rgba(0,0,0,0.10)] md:size-[78px]">
                    <Icon name={item.icon} className="size-[22px] text-(--color-home-brand) md:size-[30px]" />
                  </span>
                  <span className="text-[13px] font-semibold text-(--color-home-brand) md:text-base">
                    {t(item.labelKey)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
