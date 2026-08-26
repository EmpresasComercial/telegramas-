import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { APP_CONFIG } from '../../../constants/config';

interface AnnouncementPopupProps {
  isOpen: boolean;
  onClose: () => void;
  communityLink?: string;
}

export const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ isOpen, onClose, communityLink }) => {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
            className="bg-[#F2F2F2] w-full max-w-[480px] rounded-none relative overflow-hidden select-none font-sans antialiased"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#F2F2F2]">
              <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
                {t('home.announcement.tips')}
              </h1>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[#AAAAAA] hover:text-[#202020] active:scale-95 transition-transform"
                aria-label="Fechar"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-4 max-h-[50vh] overflow-y-auto">
              <p className="text-[13px] text-[#555555] font-normal leading-relaxed">
                {t('home.announcement.reward_notice')}
              </p>
              <p className="text-[13px] text-[#555555] font-normal leading-relaxed mt-3">
                {t('home.announcement.invite_notice')}
              </p>
              <p className="text-[13px] text-[#555555] font-normal leading-relaxed mt-3">
                {t('home.announcement.promo_notice')}
              </p>
            </div>

            <div className="px-4 pb-6 pt-1 flex flex-col gap-2">
              <button
                onClick={() => window.open(communityLink || APP_CONFIG.WHATSAPP_COMMUNITY_LINK, '_blank')}
                className="w-full h-[44px] rounded-none bg-[#FE384F] hover:bg-[#E02E44] active:scale-[0.99] text-white font-normal text-[13.5px] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 stroke-[1.8]" />
                {t('home.community_btn')}
              </button>
              <button
                onClick={onClose}
                className="w-full h-[44px] rounded-none bg-white text-[#555555] font-normal text-[13.5px] hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2F2F2]">
              <motion.div
                key={`progress-${isOpen}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: APP_CONFIG.POPUP_AUTO_CLOSE_TIME / 1000, ease: 'linear' }}
                className="h-full bg-[#FE384F]"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
