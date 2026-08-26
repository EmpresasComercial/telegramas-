import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CAROUSEL_IMAGES } from '../../../constants/images';

export const HeroSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const preloadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!preloadedRef.current && typeof window !== 'undefined') {
      preloadedRef.current = true;
      CAROUSEL_IMAGES.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== CAROUSEL_IMAGES[0]) {
      target.src = CAROUSEL_IMAGES[0];
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#FAFAFA] aspect-[16/9] max-h-[240px] select-none border-b border-gray-100">
      <div className="relative w-full h-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'tween', ease: 'easeInOut', duration: 0.45 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#FAFAFA]"
          >
            <img
              src={CAROUSEL_IMAGES[currentIndex]}
              alt={`Slide ${currentIndex + 1}`}
              className="w-full h-full object-cover object-center"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              onError={handleImageError}
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-xs">
        {CAROUSEL_IMAGES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`transition-all h-1.5 cursor-pointer rounded-full ${
              idx === currentIndex
                ? 'w-4 bg-[#FE384F]'
                : 'w-1.5 bg-white/70 hover:bg-white'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
