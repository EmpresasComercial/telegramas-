import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Send, HelpCircle, MessageSquareText, Headset, X } from 'lucide-react';

export default function FloatingSupport() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuOptions = [
    { 
      label: 'Comunidade Telegram', 
      icon: <Send className="w-4 h-4 text-white -rotate-12 translate-x-[-0.5px] translate-y-[-0.5px]" strokeWidth={2.2} />, 
      path: '/chat-comunidade',
      gradient: 'from-[#0088CC] to-[#00A8E8]',
      shadow: 'shadow-[0_3px_10px_rgba(0,136,204,0.35)]',
      badgeColor: 'text-[#0088CC]'
    },
    { 
      label: 'FAQ & Ajuda', 
      icon: <HelpCircle className="w-4 h-4 text-white" strokeWidth={2.2} />, 
      path: '/help-faq',
      gradient: 'from-[#F59E0B] to-[#EA580C]',
      shadow: 'shadow-[0_3px_10px_rgba(234,88,12,0.35)]',
      badgeColor: 'text-[#EA580C]'
    },
    { 
      label: 'Feedback & Opinião', 
      icon: <MessageSquareText className="w-4 h-4 text-white" strokeWidth={2.2} />, 
      path: '/suporte/feedback',
      gradient: 'from-[#FE384F] to-[#E02038]',
      shadow: 'shadow-[0_3px_10px_rgba(254,56,79,0.35)]',
      badgeColor: 'text-[#FE384F]'
    }
  ];

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex flex-col items-end select-none">
      {/* Backdrop suave para fechar ao tocar fora */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-0 bg-black/15 transition-opacity backdrop-blur-[1px]"
        />
      )}

      {/* Itens do Menu com cores temáticas e gradiente */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col items-end space-y-3 mb-3 z-10"
          >
            {menuOptions.map((option, index) => (
              <motion.button
                key={option.path}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => {
                  navigate(option.path);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
              >
                <span className="bg-white/95 backdrop-blur-sm text-[#202020] text-[12px] font-medium px-3 py-1.5 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 group-hover:bg-[#FE384F] group-hover:text-white transition-all">
                  {option.label}
                </span>

                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${option.gradient} ${option.shadow} flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95`}>
                  {option.icon}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante Principal */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.92 }}
        className="z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-[#25D366] to-[#2BE570] hover:brightness-105 active:brightness-95 text-white shadow-[0_4px_16px_rgba(37,211,102,0.4)] flex items-center justify-center cursor-pointer transition-all focus:outline-none"
        aria-label="Atendimento WhatsApp"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {isOpen ? (
            <X className="w-5 h-5 stroke-[2.4]" />
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
