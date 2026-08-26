import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function SmartImage({ 
  src, 
  alt, 
  fallbackSrc = '',
  className,
  ...props 
}: SmartImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-gray-100", className)}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 flex items-center justify-center">
           <div className="w-8 h-8 border-2 border-ms-blue/20 border-t-ms-blue rounded-full animate-spin" />
        </div>
      )}
      
      <img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        className={cn(
          "w-full h-full transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100",
          className?.includes('object-') ? "" : "object-cover"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
}
