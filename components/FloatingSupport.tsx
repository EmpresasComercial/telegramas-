import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, HelpCircle, X, Headphones, Send } from 'lucide-react';

export default function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const options = [
    {
      label: 'Atendimento Telegram',
      icon: <Headphones className="w-4 h-4 text-white" />,
      action: () => navigate('/telegramBussiness'),
      gradient: 'from-[#1e96c8] to-[#50a2e9]',
      shadow: 'shadow-[0_4px_12px_rgba(36,129,204,0.3)]',
    },
    {
      label: 'Comunidade Oficial',
      icon: <MessageSquare className="w-4 h-4 text-white" />,
      action: () => navigate('/chat-comunidade'),
      gradient: 'from-[#0088cc] to-[#37aee2]',
      shadow: 'shadow-[0_4px_12px_rgba(0,136,204,0.3)]',
    },
    {
      label: 'Perguntas Frequentes (FAQ)',
      icon: <HelpCircle className="w-4 h-4 text-white" />,
      action: () => navigate('/help-faq'),
      gradient: 'from-[#8d54d9] to-[#a55eea]',
      shadow: 'shadow-[0_4px_12px_rgba(141,84,217,0.3)]',
    },
  ];

  return (
    <div className="fixed bottom-[74px] right-4 z-40 flex flex-col items-end">
      {/* Menu com as opções */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-end gap-2.5 mb-3"
          >
            {options.map((option, idx) => (
              <motion.button
                key={option.label}
                type="button"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15, delay: idx * 0.04 }}
                onClick={() => {
                  setIsOpen(false);
                  option.action();
                }}
                className="flex items-center gap-2 group cursor-pointer focus:outline-none"
              >
                {/* Rótulo da Opção */}
                <span className="bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-sm text-[#202020] dark:text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-800 transition-all">
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

      {/* Botão Flutuante Principal Oficial Telegram */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.92 }}
        className="z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] hover:brightness-105 active:brightness-95 text-white shadow-[0_4px_16px_rgba(36,129,204,0.45)] flex items-center justify-center cursor-pointer transition-all focus:outline-none"
        aria-label="Atendimento Telegram"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          {isOpen ? (
            <X className="w-5 h-5 stroke-[2.4]" />
          ) : (
            <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px]">
              <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
              <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
              <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
            </svg>
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
