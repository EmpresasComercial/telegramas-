import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, User, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    {
      name: 'Home',
      path: '/home',
      icon: <Home className="w-[21px] h-[21px] mb-0.5 text-gray-700" strokeWidth={2} />,
      activeIcon: <Home className="w-[21px] h-[21px] fill-[#25D366] text-[#25D366] mb-0.5" />
    },
    {
      name: 'Chats',
      path: '/telegramBussiness',
      icon: <MessageCircle className="w-[21px] h-[21px] mb-0.5 text-gray-700" strokeWidth={2} />,
      activeIcon: <MessageCircle className="w-[21px] h-[21px] fill-[#25D366] text-[#25D366] mb-0.5" />
    },
    {
      name: 'Contacts',
      path: '/convite',
      icon: <User className="w-[21px] h-[21px] mb-0.5 text-gray-700" strokeWidth={2} />,
      activeIcon: <User className="w-[21px] h-[21px] fill-[#25D366] text-[#25D366] mb-0.5" />
    },
    {
      name: 'Bots',
      path: '/bot-pay',
      icon: <Bot className="w-[21px] h-[21px] mb-0.5 text-gray-700" strokeWidth={2} />,
      activeIcon: <Bot className="w-[21px] h-[21px] fill-[#f2a93b] text-[#f2a93b] mb-0.5" />
    },
    {
      name: 'Perfil',
      path: '/perfil',
      isAvatar: true,
    }
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[430px] h-[64px] bg-white rounded-[32px] shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center justify-between px-1.5 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/bot-pay' && location.pathname.startsWith('/bot-pay')) ||
          (item.path === '/perfil' && location.pathname === '/settings');

        return (
          <NavLink
            key={item.name}
            to={item.path}
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-[52px] rounded-full transition-all duration-200",
              isActive ? (item.path === '/bot-pay' ? "bg-[#fff8ec]" : "bg-[#e5f5e9]") : "hover:bg-gray-50/80"
            )}
          >
            {item.isAvatar ? (
              <>
                <img
                  src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop"
                  alt="Profile"
                  className={cn(
                    "w-[21px] h-[21px] rounded-full object-cover mb-0.5",
                    isActive ? "ring-2 ring-[#25D366] ring-offset-1" : ""
                  )}
                />
                <span className={cn("text-[9.5px] leading-tight", isActive ? "text-[#25D366] font-bold" : "text-gray-700 font-medium")}>
                  {item.name}
                </span>
              </>
            ) : (
              <>
                {isActive ? item.activeIcon : item.icon}
                <span className={cn(
                  "text-[9.5px] leading-tight",
                  isActive
                    ? (item.path === '/bot-pay' ? "text-[#f2a93b] font-bold" : "text-[#25D366] font-bold")
                    : "text-gray-700 font-medium"
                )}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
