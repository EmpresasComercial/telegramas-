import { useToast } from '@/hooks/useToast';

export function useInviteLink(userId: string) {
  const inviteUrl = `${window.location.origin}/convite?ref=${userId}`;
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Link copiado!');
    } catch (e) {
      toast.error('Falha ao copiar o link');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: inviteUrl });
        toast.success('Link partilhado!');
      } catch (e) {
        toast.error('Falha ao partilhar o link');
      }
    } else {
      await copy();
    }
  };

  return { inviteUrl, copy, share };
}
