import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappManagerUrl?: string;
  whatsappGroupUrl?: string;
  telegramUrl?: string;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  whatsappManagerUrl,
  whatsappGroupUrl,
}) => {
  const navigate = useNavigate();

  const handleOpenUrl = (url?: string) => {
    if (url) window.open(url, '_blank', 'noreferrer');
  };

  const handleNavigateChat = () => {
    onClose();
    navigate('/chat-comunidade');
  };

  const actions = [
    {
      id: 'wa-manager',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      ),
      label: 'Contatar gerente no WhatsApp',
      color: 'bg-[#25D366]',
      onClick: () => handleOpenUrl(whatsappManagerUrl),
      disabled: !whatsappManagerUrl
    },
    {
      id: 'tg-manager',
      icon: (
        <svg className="w-4 h-4 fill-current ml-[-1px]" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.949z"/>
        </svg>
      ),
      label: 'Contatar gerente no Telegram',
      color: 'bg-[#0088cc]',
      onClick: handleNavigateChat,
      disabled: false
    },
    {
      id: 'wa-group',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      ),
      label: 'Entrar no grupo de WhatsApp',
      color: 'bg-[#25D366]',
      onClick: () => handleOpenUrl(whatsappGroupUrl),
      disabled: !whatsappGroupUrl
    },
    {
      id: 'tg-channel',
      icon: (
        <svg className="w-4 h-4 fill-current ml-[-1px]" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.949z"/>
        </svg>
      ),
      label: 'Entrar no canal do Telegram',
      color: 'bg-[#0088cc]',
      onClick: handleNavigateChat,
      disabled: false
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
            className="bg-[#F2F2F2] w-full max-w-[480px] rounded-none relative overflow-hidden select-none font-sans antialiased"
          >
            <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#F2F2F2]">
              <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
                Suporte
              </h1>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[#AAAAAA] hover:text-[#202020] active:scale-95 transition-transform cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-1">
              <p className="text-[12.5px] text-[#666666] font-normal leading-relaxed">
                Escolha como quer entrar em contacto com a nossa equipa de suporte.
              </p>
            </div>

            <div className="px-4 pt-2 pb-6 flex flex-col gap-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="w-full h-[44px] rounded-none bg-white hover:bg-gray-50 active:scale-[0.99] text-[#202020] font-normal text-[13.5px] flex items-center gap-3 px-4 transition-all cursor-pointer disabled:opacity-40 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className={`w-7 h-7 rounded-none ${action.color} flex items-center justify-center text-white shrink-0`}>
                    {action.icon}
                  </div>
                  <span className="flex-1 text-left">
                    {action.label}
                  </span>
                </button>
              ))}

              <button
                onClick={onClose}
                className="w-full h-[44px] rounded-none bg-white text-[#555555] font-normal text-[13.5px] hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer mt-1"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
