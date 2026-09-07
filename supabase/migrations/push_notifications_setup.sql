-- ==============================================================================
-- SCHEMA & TABELAS PARA WEB PUSH NOTIFICATIONS (VAPID) - Telegram Business
-- ==============================================================================

-- 1. Criação da tabela para armazenar os aparelhos e inscrições push dos usuários
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índices para busca rápida por usuário
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- 3. Habilita Segurança em Nível de Linha (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: O usuário só pode ver/gerenciar as inscrições dos seus próprios dispositivos
CREATE POLICY "Users can insert their own push subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own push subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Função segura para salvar/atualizar a inscrição Push
CREATE OR REPLACE FUNCTION public.save_push_subscription(
    p_endpoint TEXT,
    p_keys_p256dh TEXT,
    p_keys_auth TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;

    INSERT INTO public.push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, user_agent, updated_at)
    VALUES (v_user_id, p_endpoint, p_keys_p256dh, p_keys_auth, p_user_agent, now())
    ON CONFLICT (endpoint) 
    DO UPDATE SET 
        user_id = v_user_id,
        keys_p256dh = EXCLUDED.keys_p256dh,
        keys_auth = EXCLUDED.keys_auth,
        user_agent = EXCLUDED.user_agent,
        updated_at = now();

    RETURN jsonb_build_object('success', true, 'message', 'Inscrição push salva com sucesso');
END;
$$;

-- 5. Tabela de Histórico de Notificações Enviadas (para auditoria e log)
CREATE TABLE IF NOT EXISTS public.push_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/perfil',
    status TEXT DEFAULT 'pending', -- 'sent', 'failed', 'pending'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs" 
ON public.push_notifications_log 
FOR SELECT 
USING (auth.uid() = user_id);
