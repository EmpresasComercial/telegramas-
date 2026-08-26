import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: string;
}

/**
 * Elemento base atômico de Skeleton com efeito shimmer
 */
export function Skeleton({ className, rounded = 'rounded-md', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer',
        rounded,
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton para linhas de texto simuladas
 */
export function SkeletonText({ 
  lines = 2, 
  className,
  lastLineWidth = 'w-3/4'
}: { 
  lines?: number; 
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3.5',
            i === lines - 1 && lines > 1 ? lastLineWidth : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton para Cards genéricos (estilo Telegram Business com borda suave)
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-[8px] p-4 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3', className)}>
      <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10" rounded="rounded-[8px]" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-1/3 h-4" />
          <Skeleton className="w-1/4 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-16" rounded="rounded-[6px]" />
    </div>
  );
}

/**
 * Skeleton para Lista de Linhas / Itens
 */
export function SkeletonRow({ hasAvatar = true }: { hasAvatar?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4">
      <div className="flex items-center space-x-3.5">
        {hasAvatar && <Skeleton className="w-[30px] h-[30px]" rounded="rounded-[7px]" />}
        <div className="space-y-1.5">
          <Skeleton className="w-24 h-3.5" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="w-16 h-3.5" />
        <Skeleton className="w-3.5 h-3.5" rounded="rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton de Card de Produto no Catálogo
 */
export function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-[10px] border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
      {/* Imagem do Produto */}
      <Skeleton className="w-full h-44" rounded="rounded-[8px]" />
      
      {/* Detalhes */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-16 h-4" rounded="rounded-full" />
        </div>
        <Skeleton className="w-full h-3" />
      </div>

      {/* Grid de Especificações */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
        <Skeleton className="w-full h-12" rounded="rounded-[6px]" />
        <Skeleton className="w-full h-12" rounded="rounded-[6px]" />
      </div>

      {/* Botão de Ação */}
      <Skeleton className="w-full h-11" rounded="rounded-[8px]" />
    </div>
  );
}

/**
 * Skeleton de Página Completa de Produtos
 */
export function ProductsPageSkeleton() {
  return (
    <div className="w-full bg-white min-h-screen pb-24 font-sans">
      {/* Header */}
      <header className="bg-white px-6 h-16 flex items-center justify-between border-b border-gray-100 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Skeleton className="w-16 h-4" />
          <span className="w-px h-3 bg-gray-200"></span>
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-20 h-7" rounded="rounded-full" />
      </header>

      {/* Banner / Header Top */}
      <div className="px-4 py-4">
        <Skeleton className="w-full h-28" rounded="rounded-[10px]" />
      </div>

      {/* Grid de Produtos */}
      <main className="max-w-[480px] mx-auto px-4 space-y-4">
        <SkeletonProductCard />
        <SkeletonProductCard />
      </main>
    </div>
  );
}

/**
 * Skeleton de Página de Operações / Tarefas Diárias
 */
export function OperationsPageSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center font-sans">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-gray-50">
        <Skeleton className="w-6 h-6" rounded="rounded-full" />
        <Skeleton className="w-36 h-4" />
        <div className="w-6" />
      </header>

      <main className="flex-1 w-full max-w-[450px] px-6 pb-20 pt-6 space-y-8">
        {/* Status */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-4 h-4" rounded="rounded-full" />
            <Skeleton className="w-28 h-4" />
          </div>
          <Skeleton className="w-16 h-5" rounded="rounded-full" />
        </div>

        {/* Card Principal Circular */}
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50/60 rounded-[12px] space-y-6">
          <Skeleton className="w-48 h-48" rounded="rounded-full" />
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-44 h-3.5" />
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-100 rounded-[8px] p-4 space-y-2">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-24 h-5" />
          </div>
          <div className="bg-white border border-gray-100 rounded-[8px] p-4 space-y-2">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-24 h-5" />
          </div>
        </div>

        {/* Botão */}
        <Skeleton className="w-full h-12" rounded="rounded-[8px]" />
      </main>
    </div>
  );
}

/**
 * Skeleton de Página de Convite / Equipe
 */
export function InvitePageSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] pb-24 font-sans">
      {/* Top Banner Skeleton */}
      <div className="bg-gradient-to-br from-[#D32F2F] via-[#C62828] to-[#B71C1C] pt-7 pb-16 px-5">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Skeleton className="w-8 h-8 opacity-40" rounded="rounded-full" />
          <Skeleton className="w-28 h-5 opacity-40" />
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 -mt-8 space-y-3.5">
        {/* Card Código de Convite */}
        <div className="bg-white rounded-[8px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100 space-y-3">
          <Skeleton className="w-28 h-3.5" />
          <Skeleton className="w-full h-12" rounded="rounded-[6px]" />
          <Skeleton className="w-full h-10" rounded="rounded-[6px]" />
        </div>

        {/* Tabs de Níveis */}
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" rounded="rounded-[8px]" />
          <Skeleton className="flex-1 h-10" rounded="rounded-[8px]" />
          <Skeleton className="flex-1 h-10" rounded="rounded-[8px]" />
        </div>

        {/* Lista de Membros */}
        <div className="bg-white rounded-[8px] divide-y divide-gray-100 border border-gray-100">
          {[...Array(4)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de Histórico / Transações
 */
export function HistoryPageSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] pb-24 font-sans">
      <header className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-50">
        <Skeleton className="w-7 h-7" rounded="rounded-full" />
        <Skeleton className="w-36 h-4" />
        <div className="w-7" />
      </header>

      {/* Tabs */}
      <div className="max-w-[430px] mx-auto px-4 pt-4 flex gap-2">
        <Skeleton className="flex-1 h-9" rounded="rounded-[6px]" />
        <Skeleton className="flex-1 h-9" rounded="rounded-[6px]" />
        <Skeleton className="flex-1 h-9" rounded="rounded-[6px]" />
      </div>

      {/* Lista de Registros */}
      <div className="max-w-[430px] mx-auto px-4 pt-4 space-y-2.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-[8px] p-4 border border-gray-100 space-y-2.5 shadow-sm">
            <div className="flex justify-between items-center">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-20 h-4" />
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-50">
              <Skeleton className="w-24 h-3" />
              <Skeleton className="w-16 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton de Configurações de Conta
 */
export function AccountSettingsSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#D32F2F] via-[#C62828] to-[#B71C1C] pt-7 pb-16 px-5">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Skeleton className="w-8 h-8 opacity-40" rounded="rounded-full" />
          <Skeleton className="w-32 h-4 opacity-40" />
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 -mt-8 space-y-3.5">
        <div className="bg-white rounded-[8px] p-4 border border-gray-100 shadow-sm flex items-center space-x-3.5">
          <Skeleton className="w-[30px] h-[30px]" rounded="rounded-[7px]" />
          <Skeleton className="w-32 h-4" />
        </div>

        <div className="bg-white rounded-[8px] divide-y divide-gray-100 border border-gray-100 shadow-sm">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>

        <div className="bg-white rounded-[8px] p-4 border border-gray-100 shadow-sm">
          <Skeleton className="w-full h-8" rounded="rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}

