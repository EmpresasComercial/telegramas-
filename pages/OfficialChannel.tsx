import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MoreVertical, 
  Paperclip, 
  Bell, 
  BellOff, 
  Share2, 
  Eye, 
  Send,
  X,
  Loader2,
  Upload
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ChannelPost {
  id: string;
  isProof?: boolean;
  createdAt?: number;
  forwardedFrom?: {
    name: string;
    avatar?: string;
  };
  title?: string;
  amount?: string;
  content: string;
  image?: string;
  time: string;
  views: string;
  reactions: {
    emoji: string;
    count: number;
    userReacted: boolean;
  }[];
}

const STORAGE_KEY_POSTS = 'official_channel_posts_v1';

// Metas para Provas de Retirada após 1 hora (60 minutos)
const TARGET_VIEWS = 5785;
const TARGET_LIKES = 1000;
const TARGET_LOVE = 700;
const TARGET_FIRE = 275;
const TARGET_DURATION_MS = 60 * 60 * 1000; // 60 minutos

// Gera uma semente numérica determinística a partir de um ID de post (hash simples)
const seedFromId = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

// Retorna um fator de variação único por post: entre 0.88 e 1.12
const postVariance = (id: string, slot: number): number => {
  const seed = seedFromId(id + slot);
  // pseudo-random 0..1 from seed
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  return 0.88 + rand * 0.24; // ±12%
};

// Função determinística e persistente para calcular métricas ao longo de 1 hora
// Cada post tem variação única derivada do seu ID, logo os números nunca são iguais
export const calculateProofMetrics = (createdAtMs: number, postId: string = '') => {
  const elapsed = Math.max(0, Date.now() - createdAtMs);
  const progress = Math.min(1, elapsed / TARGET_DURATION_MS);

  const vViews = postVariance(postId, 1);
  const vLikes = postVariance(postId, 2);
  const vLove  = postVariance(postId, 3);
  const vFire  = postVariance(postId, 4);

  if (progress >= 1) {
    return {
      views: Math.round(TARGET_VIEWS * vViews),
      likes: Math.round(TARGET_LIKES * vLikes),
      love:  Math.round(TARGET_LOVE  * vLove),
      fire:  Math.round(TARGET_FIRE  * vFire)
    };
  }

  // Progressão gradual simulando utilizadores reais, com variação única por post
  const views = Math.floor(1 + progress * (TARGET_VIEWS * vViews - 1));
  const likes = Math.floor(progress * TARGET_LIKES * vLikes);
  const love  = Math.floor(progress * TARGET_LOVE  * vLove);
  const fire  = Math.floor(progress * TARGET_FIRE  * vFire);

  return { views, likes, love, fire };
};

const INITIAL_POSTS: ChannelPost[] = [
  {
    id: 'post-1',
    content: `para criar campanhas, atividades, parcerias e novas oportunidades dentro da plataforma.\n\nQueremos que empresas, criadores, parceiros e utilizadores possam fazer parte desse crescimento.\n\nESTA É A MANEIRA DA ASIARAY MÍDIA.`,
    time: '14:44',
    views: '1',
    reactions: [
      { emoji: '❤️', count: 1, userReacted: true }
    ]
  },
  {
    id: 'post-2',
    forwardedFrom: {
      name: 'Channel Asiaray Angola - Gestão...',
      avatar: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop'
    },
    image: '/tutorial_retirada.png',
    title: 'Como fazer uma retirada?',
    content: `Clique em "Retirar", digite o valor desejado, escolha AOA ou USDT e clique em "Confirmar".`,
    time: '14:44',
    views: '1',
    reactions: [
      { emoji: '❤️', count: 1, userReacted: true }
    ]
  },
  {
    id: 'post-3',
    forwardedFrom: {
      name: 'Pavel Durov Fundador',
      avatar: '/pavel_durov.jpg'
    },
    title: '🌟 Lançamento Oficial do Sistema Telegram Stars!',
    content: `Temos o prazer de anunciar o lançamento do novo sistema Telegram Stars na nossa aplicação!\n\nAgora você pode adquirir pacotes de Estrelas digitais para ativação rápida de Bots e serviços na plataforma, com liquidação instantânea.\n\nAcesse a seção de Estrelas no topo da página ou pelo menu lateral para conferir todos os benefícios!`,
    time: '15:10',
    views: '12.8K',
    reactions: [
      { emoji: '🔥', count: 42, userReacted: false },
      { emoji: '👍', count: 89, userReacted: true }
    ]
  }
];

// Utilitário leve de compressão de imagem via Canvas nativo
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const max = 1200;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// Função para eliminar estritamente qualquer post duplicado por ID ou por imagem
const deduplicatePosts = (postList: ChannelPost[]): ChannelPost[] => {
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  const result: ChannelPost[] = [];

  for (const p of postList) {
    if (seenIds.has(p.id)) continue;
    if (p.image && seenImages.has(p.image)) continue;

    seenIds.add(p.id);
    if (p.image) seenImages.add(p.image);
    result.push(p);
  }
  return result;
};

export default function OfficialChannel() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { session } = useAuth();

  const [posts, setPosts] = useState<ChannelPost[]>(INITIAL_POSTS);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [subscribersCount] = useState('1 inscrito');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ticker para atualizar dinamicamente visualizações e reações em tempo real
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 10000); // 10 segundos
    return () => clearInterval(timer);
  }, []);

  // Estados para anexo e envio de Prova de Retirada
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [proofAmount, setProofAmount] = useState('');
  const [proofComment, setProofComment] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Carrega e sincroniza posts salvos no LocalStorage e no Supabase sem duplicidade
  useEffect(() => {
    let localSaved: ChannelPost[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localSaved = deduplicatePosts(parsed).map(p => {
            const isProof = p.isProof || !!p.amount || p.id.startsWith('sp-') || p.id.startsWith('proof-');
            if (isProof) {
              return {
                ...p,
                isProof: true,
                createdAt: p.createdAt || (Date.now() - 65 * 60 * 1000)
              };
            }
            return p;
          });
          localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(localSaved));
        }
      }
    } catch (e) {
      console.warn('Erro ao ler posts locais:', e);
    }

    const fetchSupabaseProofs = async () => {
      try {
        const { data, error } = await supabase
          .from('social_proofs_mcpn')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && Array.isArray(data)) {
          const dbPosts: ChannelPost[] = data
            .filter((row: any) => row.conteudo?.imagem_url || row.imagem_url)
            .map((row: any) => {
              const val = Number(row.valor || 0);
              const valStr = val > 0 ? `${val.toLocaleString('pt-AO')} Kz` : '';
              const comment = row.conteudo?.comentario || row.comentario || '';
              const img = row.conteudo?.imagem_url || row.imagem_url;
              const date = row.created_at ? new Date(row.created_at) : new Date();

              return {
                id: `sp-${row.id}`,
                isProof: true,
                createdAt: date.getTime(),
                forwardedFrom: {
                  name: `Prova de Retirada • Membro ***${String(row.user_id || '').substring(0, 4)}`,
                  avatar: '/botRetirada.jpg'
                },
                title: valStr ? `💸 Retirada Concluída: ${valStr}` : '💸 Retirada Concluída',
                amount: valStr,
                content: (comment ? `${comment}\n\n` : '') + '✅ Comprovativo autenticado na plataforma.',
                image: img,
                time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                views: '1',
                reactions: [
                  { emoji: '👍', count: 0, userReacted: false },
                  { emoji: '❤️', count: 0, userReacted: false },
                  { emoji: '🔥', count: 0, userReacted: false }
                ]
              };
            });

          setPosts(() => deduplicatePosts([...INITIAL_POSTS, ...localSaved, ...dbPosts]));
        }
      } catch (err) {
        console.warn('Erro ao carregar comprovativos do Supabase:', err);
      }
    };

    if (localSaved.length > 0) {
      setPosts(() => deduplicatePosts([...INITIAL_POSTS, ...localSaved]));
    }

    fetchSupabaseProofs();

    // Sincronização em tempo real de novas provas sociais aprovadas
    const channel = supabase
      .channel('official_channel_proofs_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_proofs_mcpn' },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;
          const val = Number(row.valor || 0);
          const valStr = val > 0 ? `${val.toLocaleString('pt-AO')} Kz` : '';
          const comment = row.conteudo?.comentario || row.comentario || '';
          const img = row.conteudo?.imagem_url || row.imagem_url;
          if (!img) return;

          const newProofPost: ChannelPost = {
            id: `sp-${row.id}`,
            isProof: true,
            createdAt: new Date(row.created_at || Date.now()).getTime(),
            forwardedFrom: {
              name: `Prova de Retirada • Membro ***${String(row.user_id || '').substring(0, 4)}`,
              avatar: '/botRetirada.jpg'
            },
            title: valStr ? `💸 Retirada Concluída: ${valStr}` : '💸 Retirada Concluída',
            amount: valStr,
            content: (comment ? `${comment}\n\n` : '') + '✅ Comprovativo autenticado na plataforma.',
            image: img,
            time: new Date(row.created_at || Date.now()).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            views: '1',
            reactions: [
              { emoji: '👍', count: 0, userReacted: false },
              { emoji: '❤️', count: 0, userReacted: false },
              { emoji: '🔥', count: 0, userReacted: false }
            ]
          };

          setPosts(prev => deduplicatePosts([...prev, newProofPost]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const savePostsToLocalStorage = (updated: ChannelPost[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar posts localmente:', e);
    }
  };

  const handleToggleReaction = (postId: string, emoji: string) => {
    setPosts(prev => {
      const next = prev.map(p => {
        if (p.id !== postId) return p;
        const isProof = p.isProof || !!p.amount || p.id.startsWith('sp-') || p.id.startsWith('proof-');
        const updatedReactions = [...(p.reactions || [])];
        const idx = updatedReactions.findIndex(r => r.emoji === emoji);
        if (idx >= 0) {
          const r = updatedReactions[idx];
          const nextUserReacted = !r.userReacted;
          updatedReactions[idx] = {
            ...r,
            count: isProof ? r.count : (nextUserReacted ? r.count + 1 : Math.max(0, r.count - 1)),
            userReacted: nextUserReacted
          };
        } else {
          updatedReactions.push({ emoji, count: 1, userReacted: true });
        }
        return { ...p, reactions: updatedReactions };
      });
      savePostsToLocalStorage(next);
      return next;
    });
  };

  const handleForwardPost = (post: ChannelPost) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${post.title ? post.title + '\n\n' : ''}${post.content}`);
    }
    showToast('Link e conteúdo do post copiados para encaminhar!', 'success');
  };

  // Envio de anúncio ou mensagem de texto comum
  const handleSendBroadcast = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const newPost: ChannelPost = {
      id: `post-${Date.now()}`,
      content: inputText.trim(),
      time: timeStr,
      views: '1',
      reactions: [
        { emoji: '❤️', count: 1, userReacted: true }
      ]
    };

    setPosts(prev => {
      const next = [...prev, newPost];
      savePostsToLocalStorage(next);
      return next;
    });

    setInputText('');
    showToast('Publicação transmitida no canal!', 'success');

    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  // Seleção de imagem via galeria / arquivo (clique no 📎)
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setPreviewImage(compressed);
      // Se o utilizador já tiver digitado algo no input, preenche o comentário
      if (inputText.trim() && !proofComment) {
        setProofComment(inputText.trim());
      }
      setIsProofModalOpen(true);
    } catch (err) {
      showToast('Erro ao processar imagem selecionada.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Envio do comprovativo de retirada com valor e comentário
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!previewImage) {
      showToast('Selecione uma imagem do comprovativo.', 'error');
      return;
    }

    const cleanAmount = proofAmount.replace(/\D/g, '');
    if (!cleanAmount || Number(cleanAmount) <= 0) {
      showToast('Por favor, informe o valor recebido da retirada.', 'error');
      return;
    }

    setIsSubmittingProof(true);

    try {
      let finalImageUrl = previewImage;

      // Tentar salvar no bucket provas-sociais se disponível
      try {
        const fileExt = 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const blob = await (await fetch(previewImage)).blob();
        const { error: uploadError } = await supabase.storage
          .from('provas-sociais')
          .upload(fileName, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });

        if (!uploadError) {
          finalImageUrl = supabase.storage.from('provas-sociais').getPublicUrl(fileName).data.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('Upload bucket fallback para base64:', uploadErr);
      }

      // Persistir na base de dados Supabase via inserção direta ou RPC
      let realId: string | null = null;
      if (session?.user) {
        try {
          const { data: insertedData } = await supabase
            .from('social_proofs_mcpn')
            .insert({
              user_id: session.user.id,
              valor: Number(cleanAmount),
              status: 'aprovado',
              conteudo: {
                comentario: proofComment.trim(),
                imagem_url: finalImageUrl
              }
            })
            .select('id')
            .single();

          if (insertedData?.id) {
            realId = insertedData.id;
          }
        } catch (insertErr) {
          console.warn('Insert social_proofs_mcpn fallback:', insertErr);
        }
      }

      if (!realId) {
        try {
          const { data } = await supabase.rpc('submit_social_proof_mcpn', {
            p_valor: Number(cleanAmount),
            p_comentario: proofComment.trim(),
            p_imagem_url: finalImageUrl
          });
          if ((data as any)?.id) realId = (data as any).id;
        } catch (rpcErr) {
          console.warn('RPC submit_social_proof_mcpn fallback:', rpcErr);
        }
      }

      // Adiciona a publicação no próprio canal imediatamente com ID único
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const userPhoneMasked = session?.user?.phone
        ? session.user.phone.replace(/(\d{3})\d{3}(\d{3})/, '$1***$2')
        : 'Membro';

      const uniquePostId = realId ? `sp-${realId}` : `proof-${Date.now()}`;

      const newProofPost: ChannelPost = {
        id: uniquePostId,
        isProof: true,
        createdAt: now.getTime(),
        forwardedFrom: {
          name: `Prova de Retirada • ${userPhoneMasked}`,
          avatar: '/botRetirada.jpg'
        },
        title: `💸 Retirada Concluída: ${Number(cleanAmount).toLocaleString('pt-AO')} Kz`,
        amount: `${Number(cleanAmount).toLocaleString('pt-AO')} Kz`,
        content: (proofComment.trim() ? `${proofComment.trim()}\n\n` : '') + '✅ Comprovativo de retirada recebida com sucesso.',
        image: finalImageUrl,
        time: timeStr,
        views: '1',
        reactions: [
          { emoji: '👍', count: 0, userReacted: false },
          { emoji: '❤️', count: 0, userReacted: false },
          { emoji: '🔥', count: 0, userReacted: false }
        ]
      };

      setPosts(prev => {
        const next = deduplicatePosts([...prev, newProofPost]);
        savePostsToLocalStorage(next);
        return next;
      });

      showToast('Comprovativo de retirada publicado no canal com sucesso!', 'success');
      
      // Fecha o modal e reseta os campos
      setIsProofModalOpen(false);
      setPreviewImage(null);
      setProofAmount('');
      setProofComment('');
      setInputText('');

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);

    } catch (err: any) {
      console.error('Erro ao enviar comprovativo:', err);
      showToast(err.message || 'Erro ao enviar comprovativo.', 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div 
      className="w-full h-[100dvh] font-sans antialiased text-[#111827] select-none tg-chat-no-select flex flex-col items-center overflow-hidden relative tg-wallpaper transition-colors"
      onContextMenu={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >

      {/* Input de arquivo invisível para galeria/fotos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelected}
      />

      {/* ── HEADER IDÊNTICO AO TELEGRAM REAL ── */}
      <header className="w-full bg-white dark:bg-[#242f3d] text-gray-900 dark:text-white px-2 py-2 sticky top-0 z-40 flex items-center justify-between shadow-xs select-none border-b border-gray-200/60 dark:border-[#17212b]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/telegramBussiness')}
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-200 dark:active:bg-white/20 transition-colors cursor-pointer shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Avatar Pavel Durov Fundador */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden shadow-xs bg-[#2481cc]/20 border border-white/40">
              <img
                src="/pavel_durov.jpg"
                alt="Pavel Durov Fundador"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
                }}
              />
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[16px] font-bold text-[#111827] dark:text-white tracking-tight truncate leading-tight">
                Pavel Durov Fundador
              </h1>
              <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] shrink-0 inline-block align-middle select-none">
                <path
                  fill="#2481cc"
                  d="M10.26 2.45c.87-.6 2.05-.6 2.92 0l1.24.86c.4.28.88.42 1.37.4l1.51-.06c1.06-.04 1.98.63 2.23 1.66l.36 1.47c.12.48.38.9.76 1.21l1.17.97c.83.69 1.09 1.84.62 2.8l-.66 1.36c-.21.44-.27.94-.17 1.43l.31 1.48c.22 1.04-.37 2.07-1.41 2.47l-1.46.56c-.47.18-.86.51-1.12.94l-.79 1.3c-.56.92-1.68 1.32-2.7.98l-1.44-.48c-.46-.15-.96-.14-1.42.03l-1.43.52c-1.02.37-2.15-.01-2.73-.91l-.81-1.28c-.26-.42-.66-.74-1.13-.91l-1.47-.53c-1.05-.38-1.67-1.4-1.47-2.45l.28-1.49c.09-.48.05-.98-.14-1.43l-.63-1.38c-.45-.97-.16-2.11.69-2.78l1.19-.94c.39-.3.66-.72.79-1.19l.39-1.46c.27-1.02 1.21-1.67 2.26-1.6l1.51.09c.49.03.97-.1 1.38-.37l1.23-.88z"
                />
                <path
                  fill="#ffffff"
                  d="M9.5 12.5l-1.6-1.6a.8.8 0 0 0-1.13 1.13l2.17 2.17a.8.8 0 0 0 1.13 0l5.43-5.43a.8.8 0 0 0-1.13-1.13L9.5 12.5z"
                />
              </svg>
            </div>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-normal leading-tight">
              {subscribersCount}
            </span>
          </div>
        </div>

        {/* Três pontinhos verticais */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => showToast('Canal Oficial Verificado por Telegram Corp.', 'info')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-200 dark:active:bg-white/20 transition-colors cursor-pointer"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── FEED DE POSTAGENS DO CANAL (BALÕES NATIVOS) ── */}
      <main
        ref={scrollRef}
        className="w-full max-w-[650px] flex-1 overflow-y-auto no-scrollbar px-3 pt-3 pb-24 space-y-3 relative"
      >
        {posts.map((post) => {
          const isProofPost = post.isProof || !!post.amount || post.id.startsWith('sp-') || post.id.startsWith('proof-');

          let displayViews = post.views;
          let displayReactions = post.reactions;

          if (isProofPost) {
            const createdAtMs = post.createdAt || (Date.now() - 65 * 60 * 1000);
            const dynamic = calculateProofMetrics(createdAtMs, post.id);

            displayViews = dynamic.views.toLocaleString('pt-AO');

            const userReactionsMap: { [emoji: string]: boolean } = {};
            (post.reactions || []).forEach(r => {
              if (r.userReacted) userReactionsMap[r.emoji] = true;
            });

            displayReactions = [
              {
                emoji: '👍',
                count: dynamic.likes + (userReactionsMap['👍'] ? 1 : 0),
                userReacted: !!userReactionsMap['👍']
              },
              {
                emoji: '❤️',
                count: dynamic.love + (userReactionsMap['❤️'] ? 1 : 0),
                userReacted: !!userReactionsMap['❤️']
              },
              {
                emoji: '🔥',
                count: dynamic.fire + (userReactionsMap['🔥'] ? 1 : 0),
                userReacted: !!userReactionsMap['🔥']
              }
            ];
          }

          return (
            <div key={post.id} className="flex items-end justify-start gap-2 relative">
              
              {/* Balão Branco do Post Telegram */}
              <div className="max-w-[88%] sm:max-w-[82%] bg-white dark:bg-[#182533] rounded-[16px] rounded-tl-[4px] px-3.5 pt-3 pb-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)] border border-black/5 dark:border-white/5 relative">
                
                {/* Cabeçalho de Encaminhado */}
                {post.forwardedFrom && (
                  <div className="mb-2">
                    <span className="text-[12px] font-normal text-[#e67e22] dark:text-[#f39c12] block leading-tight">
                      Encaminhado de
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {post.forwardedFrom.avatar ? (
                        <img 
                          src={post.forwardedFrom.avatar} 
                          alt="Avatar do Canal"
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-orange-200"
                          onError={(e) => {
                            (e.target as any).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop";
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                          📢
                        </div>
                      )}
                      <span className="text-[13.5px] font-bold text-[#e67e22] dark:text-[#f39c12] truncate">
                        {post.forwardedFrom.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Imagem do Post sem corte (exibe o comprovativo completo) */}
                {post.image && (
                  <div className="mb-2.5 -mx-1.5 rounded-[12px] overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#101921] flex items-center justify-center">
                    <img
                      src={post.image}
                      alt={post.title || "Comprovativo completo"}
                      className="w-full h-auto max-h-[550px] object-contain block mx-auto rounded-[12px]"
                      onError={(e) => {
                        (e.target as any).src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=350&fit=crop";
                      }}
                    />
                  </div>
                )}

                {/* Valor do Saque destacado na cor VERDE */}
                {post.amount && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/60 text-[#16a34a] dark:text-[#22c55e] font-black text-[15px] mb-1.5 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                    <span>+ {post.amount}</span>
                  </div>
                )}

                {/* Título do Post (com valor em verde quando presente) */}
                {post.title && (
                  <h2 className="text-[15.5px] font-bold mb-1 leading-snug">
                    {post.title.includes(':') ? (
                      <>
                        <span className="text-[#111827] dark:text-white">
                          {post.title.split(':')[0]}:{' '}
                        </span>
                        <span className="text-[#16a34a] dark:text-[#22c55e] font-black">
                          {post.title.split(':')[1]}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#111827] dark:text-white">{post.title}</span>
                    )}
                  </h2>
                )}

                {/* Conteúdo do Post sem aspas */}
                <p className="text-[14.5px] text-[#111827] dark:text-[#f3f4f6] leading-relaxed break-words whitespace-pre-line font-normal pr-14">
                  {post.content}
                </p>

                {/* Rodapé da Mensagem: Reações no canto esquerdo + Visualizações e Hora no canto direito */}
                <div className="flex items-center justify-between mt-2 pt-1">
                  
                  {/* Pílulas de Reação (ex: 👍 1.000, ❤️ 700, 🔥 275) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {displayReactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => handleToggleReaction(post.id, r.emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                          r.userReacted
                            ? 'bg-[#2481cc]/15 text-[#2481cc] dark:bg-[#2481cc]/30 dark:text-[#64b5f6]'
                            : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-[13px] leading-none">{r.emoji}</span>
                        <span>{r.count >= 1000 ? r.count.toLocaleString('pt-AO') : r.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Visualizações e Horário Telegram */}
                  <div className="flex items-center gap-1 text-[11px] text-[#8e8e93] dark:text-[#8e9aa5] select-none ml-auto shrink-0 pl-2">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{displayViews}</span>
                    <span className="ml-1">{post.time}</span>
                  </div>
                </div>
              </div>

              {/* Botão de Encaminhar Rápido (Quick Share) flutuando ao lado do balão */}
              <button
                type="button"
                onClick={() => handleForwardPost(post)}
                className="w-8 h-8 rounded-full bg-white/70 dark:bg-[#242f3d]/70 backdrop-blur-xs hover:bg-white dark:hover:bg-[#242f3d] flex items-center justify-center text-[#2481cc] shadow-xs active:scale-90 transition-transform cursor-pointer shrink-0 mb-1"
                title="Encaminhar post"
                aria-label="Encaminhar post"
              >
                <Share2 className="w-4 h-4 -scale-x-100" />
              </button>
            </div>
          );
        })}
      </main>

      {/* ── BARRA INFERIOR FLUTUANTE IDÊNTICA AO TELEGRAM (SOBRE O WALLPAPER) ── */}
      <footer className="fixed bottom-0 left-0 right-0 p-2 pb-3 z-40 flex justify-center bg-transparent pointer-events-none">
        <div className="w-full max-w-[650px] flex items-center gap-2 pointer-events-auto px-2">
          
          {/* Pílula flutuante branca Telegram: [ 📎  Partilhe provas de retirada       🔔 ] */}
          <div className="flex-1 bg-white dark:bg-[#182533] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-3 py-1.5 min-h-[48px] border border-black/5 dark:border-white/10 transition-colors">
            
            {/* Clipe de Anexo na Esquerda (idêntico ao layout do Telegram) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 mr-1"
              title="Anexar comprovativo de retirada"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* Campo "Partilhe provas de retirada" */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendBroadcast();
              }}
              placeholder="Partilhe provas de retirada"
              className="flex-1 min-w-0 px-1 py-1 text-[15px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#8e8e93] dark:placeholder:text-gray-400 font-normal leading-snug"
            />

            {/* Sino de Notificação na Direita */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                showToast(isMuted ? 'Notificações ativadas' : 'Canal silenciado', 'info');
              }}
              className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 ml-1 ${
                isMuted ? 'text-[#e53e3e]' : 'text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc]'
              }`}
              title={isMuted ? "Canal silencioso" : "Canal com som"}
            >
              {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </button>
          </div>

          {/* Botão Circular Azul Telegram (Enviar quando tem texto ou disparar anexo de comprovativo) */}
          <button
            type="button"
            onClick={() => {
              if (inputText.trim()) {
                handleSendBroadcast();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="w-[48px] h-[48px] rounded-full text-white bg-[#2481cc] hover:bg-[#1f72b5] flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(36,129,204,0.4)] cursor-pointer"
            title={inputText.trim() ? "Enviar mensagem" : "Partilhar prova de retirada"}
          >
            {inputText.trim() ? (
              <Send className="w-5 h-5 text-white ml-0.5" />
            ) : (
              <Paperclip className="w-5 h-5 text-white -rotate-45" />
            )}
          </button>
        </div>
      </footer>

      {/* ── MODAL TELEGRAM: PARTILHAR PROVA DE RETIRADA (QUANDO IMAGEM É SELECIONADA) ── */}
      {isProofModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-[480px] bg-white dark:bg-[#242f3d] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar do Modal */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-[16px] font-bold text-[#111827] dark:text-white">
                Partilhar Prova de Retirada
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsProofModalOpen(false);
                  setPreviewImage(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Formulário */}
            <form onSubmit={handleSubmitProof} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              
              {/* Pré-visualização da Imagem Anexada */}
              {previewImage && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#182533] flex items-center justify-center max-h-[220px]">
                  <img
                    src={previewImage}
                    alt="Pré-visualização do Comprovativo"
                    className="w-full h-auto max-h-[220px] object-contain rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-[12px] font-medium backdrop-blur-xs flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Trocar</span>
                  </button>
                </div>
              )}

              {/* Campo Valor da Retirada */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Valor recebido (Kz) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Ex: 25.000"
                    value={proofAmount}
                    onChange={(e) => setProofAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#182533] text-[15px] font-medium text-[#111827] dark:text-white outline-none focus:border-[#2481cc] transition-colors"
                    required
                  />
                  {proofAmount && (
                    <span className="absolute right-3.5 text-[14px] font-semibold text-gray-400">
                      Kz
                    </span>
                  )}
                </div>
              </div>

              {/* Campo Comentário / Depoimento */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Comentário (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Partilhe a sua experiência com o saque ou agradecimento..."
                  value={proofComment}
                  onChange={(e) => setProofComment(e.target.value.slice(0, 250))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#182533] text-[14px] text-[#111827] dark:text-white outline-none focus:border-[#2481cc] transition-colors resize-none"
                />
                <div className="text-right text-[11px] text-gray-400 mt-0.5">
                  {proofComment.length}/250
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setPreviewImage(null);
                  }}
                  disabled={isSubmittingProof}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[14px] font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingProof || !proofAmount}
                  className="flex-1 py-2.5 rounded-xl bg-[#2481cc] hover:bg-[#1d6fae] active:scale-[0.99] text-white text-[14px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {isSubmittingProof ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar Comprovativo</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
