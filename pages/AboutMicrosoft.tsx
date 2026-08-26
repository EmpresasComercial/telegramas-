import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function AboutMicrosoft() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#F2F2F2] pb-20 font-sans antialiased text-[#202020] select-none flex flex-col items-center">
      <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/perfil')}
            className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform cursor-pointer"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          
          <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
            Sobre o Telegram Business
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-4 pt-4 space-y-3">
        {/* Cabeçalho do Documento */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-3">
          <div>
            <h2 className="text-[13.5px] font-bold text-[#202020] uppercase tracking-tight">
              Termos e Condições do Programa de Dropshipping Telegram Business
            </h2>
            <span className="text-[11px] text-[#888888] font-normal block mt-0.5 uppercase">
              (ÚLTIMA ATUALIZAÇÃO: 01 DE NOVEMBRO DE 2026)
            </span>
          </div>

          <div className="text-[12px] text-[#444444] leading-relaxed font-normal">
            <span className="font-semibold block mb-0.5 text-[#202020]">Por favor, leia estes termos e condições atentamente!</span>
            Atenção às disposições que excluem ou limitam a responsabilidade e aos termos de lei aplicável e jurisdição.
          </div>

          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2 font-normal pt-1">
            <p>
              Este Contrato de Usuário do Programa de Dropshipping Telegram Business (o “Contrato”), juntamente com as Regras Relevantes, estabelece os termos e condições aplicáveis à participação no Programa de Dropshipping Telegram Business (o “Programa”).
            </p>
            <p>
              Ao aceitar este Contrato, você declara que avaliou independentemente a conveniência de participar do Programa, possui capacidade legal para contratar, atingiu a maioridade no seu local de origem e residência e concorda em cumprir este Contrato e todas as Regras Relevantes.
            </p>
          </div>
        </div>

        {/* 1. Definições */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            1. Definições
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2">
            <p>
              <strong className="text-[#202020] font-semibold">1.1 “Plataforma Telegram Business”:</strong> significa a plataforma de comércio eletrônico Telegram Business, incluindo seus websites, subdomínios e aplicativos móveis.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">1.2 “Consumidor Final”:</strong> significa o consumidor que celebra contrato com o Participante para adquirir mercadorias obtidas dos Vendedores por meio do plano de dropshipping.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">1.3 “Direitos de Propriedade Intelectual”:</strong> incluem patentes, direitos autorais, marcas, nomes comerciais e de domínio, desenhos industriais, software, bases de dados, informações confidenciais, know-how, segredos comerciais e demais direitos de propriedade intelectual, registrados ou não, incluindo seus pedidos, renovações e extensões.
            </p>
          </div>
        </div>

        {/* 2. Aplicação e Aceitação dos Termos */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            2. Aplicação e Aceitação dos Termos
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2">
            <p>
              <strong className="text-[#202020] font-semibold">2.1</strong> Este Contrato, juntamente com as Regras Relevantes, constitui o acordo integral entre o Participante e o Telegram Business relativamente ao uso do DS Center e dos serviços prestados no âmbito do Programa, incluindo os termos de adesão, termos de uso, contratos de serviços aplicáveis e todas as regras, políticas e condições publicadas periodicamente no DS Center.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">2.2</strong> As Regras Relevantes fazem parte integrante deste Contrato e possuem a mesma força. Em caso de conflito, prevalecerão as políticas e os termos publicados pelo Telegram Business, seguidos das demais Regras Relevantes.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">2.3</strong> O Telegram Business poderá alterar ou reformular as Regras Relevantes periodicamente, inclusive sem aviso prévio. As alterações entrarão em vigor na data indicada no anúncio. A continuação do uso do DS Center ou do Programa após a publicação será considerada aceitação das alterações.
            </p>
          </div>
        </div>

        {/* 3. Inscrição */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            3. Inscrição
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2">
            <p>
              <strong className="text-[#202020] font-semibold">3.1</strong> A participação no Programa depende do registro aprovado de uma conta de membro comprador e da aprovação da solicitação apresentada ao DS Center para participação no plano de dropshipping.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">3.2</strong> O Telegram Business poderá suspender ou encerrar os serviços se verificar que o Participante não cumpre os requisitos deste Contrato ou não é considerado adequado para participar do Programa.
            </p>
          </div>
        </div>

        {/* 4. O Programa */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            4. O Programa
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2">
            <p>
              <strong className="text-[#202020] font-semibold">4.1</strong> O Programa fornece serviços técnicos eletrônicos para apoiar o negócio de dropshipping do Participante, permitindo navegar por mercadorias selecionadas, realizar pedidos por ferramentas aprovadas e utilizar outras funcionalidades disponibilizadas e atualizadas periodicamente pelo Telegram Business.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">4.2</strong> O Telegram Business poderá limitar determinados recursos do DS Center. O DS Center não representa o Vendedor em transações específicas. O Telegram Business não controla nem se responsabiliza pela qualidade, segurança, legalidade ou disponibilidade das mercadorias ou serviços oferecidos pelos Vendedores, nem pela capacidade destes de concluir uma venda.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">4.3</strong> O Telegram Business poderá remover qualquer produto ou serviço da Plataforma ou dos Serviços, a qualquer momento e por qualquer motivo, sem aviso prévio.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">4.4</strong> O Telegram Business poderá cobrar pelo acesso ou utilização do DS Center ou de determinadas funcionalidades, mediante aviso prévio de 30 dias.
            </p>
          </div>
        </div>

        {/* 5. Responsabilidades, Declarações e Garantias */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            5. Responsabilidades, Declarações e Garantias
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2.5">
            <p>
              <strong className="text-[#202020] font-semibold">5.1</strong> O Participante é responsável por todas as atividades realizadas na sua conta e pela proteção dos seus dados de acesso. Qualquer uso não autorizado ou violação de segurança deverá ser comunicado imediatamente ao Telegram Business.
            </p>
            <div>
              <p>
                <strong className="text-[#202020] font-semibold">5.2</strong> O Participante deverá cumprir as regras da Plataforma e não poderá abusar da Proteção ao Comprador, incluindo:
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#555555]">
                <li>solicitar devoluções ou reembolsos de forma abusiva;</li>
                <li>abrir ou escalar disputas de forma indevida ou em grande número sem provas;</li>
                <li>apresentar informações falsas ou provas falsificadas.</li>
              </ul>
              <p className="mt-1.5">
                O abuso poderá resultar na retenção de pedidos de devolução ou reembolso, limitação da conta e cobrança das perdas sofridas pelo Telegram Business ou pelos Vendedores.
              </p>
            </div>
            <p>
              <strong className="text-[#202020] font-semibold">5.3</strong> Disputas, devoluções e pedidos de reembolso deverão ser realizados de forma razoável e de acordo com a situação real dos produtos e da logística. O Telegram Business apoiará a resolução conforme suas regras e políticas.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">5.4</strong> Todos os documentos e provas apresentados em disputas deverão ser verdadeiros e estar de acordo com as regras do Telegram Business. É proibido utilizar documentos ou provas de outros compradores ou encomendas, ou praticar qualquer fraude. A violação poderá resultar em decisão desfavorável, limitação de funcionalidades ou encerramento da conta.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">5.5</strong> É proibido fornecer avaliações falsas ou maliciosas ou praticar atos maliciosos contra os Vendedores.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">5.6</strong> O Participante não poderá utilizar dados pessoais de terceiros, incluindo telefone, documento de identidade ou endereço, para realizar pedidos ou outros fins sem o consentimento prévio e escrito da pessoa.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">5.7</strong> O Telegram Business poderá suspender ou encerrar a conta caso o Participante tente estabelecer contato ou relacionamento direto com Vendedores fora das ferramentas, serviços ou canais disponibilizados pela Plataforma.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">5.8</strong> Quando solicitado durante uma disputa, o Participante deverá fornecer informações, documentos, comprovativos de entrega, rastreamento, pagamentos ou outras provas necessárias.
            </p>
            <div>
              <p>
                <strong className="text-[#202020] font-semibold">5.9</strong> O Participante declara e garante que:
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#555555]">
                <li>possui capacidade e autoridade para celebrar este Contrato;</li>
                <li>possui autorização dos Consumidores Finais para compartilhar os seus dados pessoais com o Telegram Business e os Vendedores para realizar pedidos;</li>
                <li>cumprirá todas as leis e regulamentos aplicáveis e manterá as contas, licenças, permissões e aprovações necessárias.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 6. Propriedade Intelectual */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            6. Propriedade Intelectual
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2">
            <p>
              <strong className="text-[#202020] font-semibold">6.1</strong> O Participante não poderá utilizar, solicitar ou registrar marcas, nomes comerciais, logotipos, nomes de domínio ou outros elementos idênticos ou semelhantes aos pertencentes ao Telegram Business, às suas afiliadas ou entidades relacionadas.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">6.2</strong> É proibido copiar ou modificar ícones, botões, banners, arquivos gráficos ou conteúdos disponibilizados no DS Center, nas lojas dos Vendedores ou nos domínios do Telegram Business, salvo autorização expressa e escrita.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">6.3</strong> Este Contrato não concede ao Participante qualquer direito de propriedade, licença ou interesse sobre produtos, serviços, tecnologia ou Direitos de Propriedade Intelectual do Telegram Business, salvo quando expressamente acordado por escrito.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">6.4</strong> Em caso de violação de Direitos de Propriedade Intelectual, o Participante deverá cessar imediatamente a infração e remover o material infrator. O Telegram Business poderá limitar ou encerrar o acesso ao DS Center ou à Plataforma e congelar o saldo, quando aplicável.
            </p>
          </div>
        </div>

        {/* 7. Privacidade */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            7. Privacidade
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed">
            <p>
              <strong className="text-[#202020] font-semibold">7.1</strong> Durante a participação no Programa, determinadas informações pessoais poderão ser recolhidas e processadas de acordo com o aviso de privacidade aplicável. O uso do DS Center e da Plataforma está sujeito à Política de Privacidade do Telegram Business.
            </p>
          </div>
        </div>

        {/* 8. Confidencialidade */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            8. Confidencialidade
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2">
            <p>
              <strong className="text-[#202020] font-semibold">8.1</strong> “Informações Confidenciais” são informações comerciais ou técnicas divulgadas pelo DS Center que sejam identificadas como confidenciais ou que, pelas circunstâncias, devam razoavelmente ser consideradas confidenciais.
            </p>
            <p>
              <strong className="text-[#202020] font-semibold">8.2</strong> O Participante utilizará essas informações apenas para executar este Contrato e não as divulgará a terceiros, exceto aos seus diretores, funcionários e agentes que necessitem conhecê-las. A divulgação será permitida quando exigida por tribunal, autoridade administrativa ou órgão governamental, desde que, quando possível, o DS Center seja previamente informado.
            </p>
          </div>
        </div>

        {/* 9. Declarações e Garantias Adicionais */}
        <div className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <h3 className="text-[13px] font-bold text-[#202020] uppercase tracking-wide border-b border-gray-100 pb-1.5">
            9. Declarações e Garantias Adicionais
          </h3>
          <div className="text-[12.5px] text-[#555555] leading-relaxed space-y-2.5">
            <div>
              <p>
                <strong className="text-[#202020] font-semibold">9.1</strong> O Participante é exclusivamente responsável pelo conteúdo e pela forma de apresentação dos seus Sites, garantindo que estejam:
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#555555]">
                <li>em conformidade com este Contrato e as Regras Relevantes;</li>
                <li>de acordo com todas as leis e regulamentos aplicáveis;</li>
                <li>livres de violações aos direitos legítimos de terceiros, incluindo Direitos de Propriedade Intelectual.</li>
              </ul>
            </div>
            <p>
              <strong className="text-[#202020] font-semibold">9.2</strong> O Participante será responsável por obter as licenças e autorizações necessárias de terceiros relacionadas à venda de mercadorias provenientes do Telegram Business e declara que não está sujeito a sanções, restrições comerciais ou outras limitações legais que impeçam suas atividades.
            </p>
            <div>
              <p>
                <strong className="text-[#202020] font-semibold">9.3</strong> Todos os dados, informações, documentos e provas enviados ao Telegram Business, especialmente pelo DS Center, deverão ser:
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1 text-[#555555]">
                <li>verdadeiros, precisos, completos e legais;</li>
                <li>não falsos, enganosos ou fraudulentos;</li>
                <li>livres de conteúdo difamatório, ameaçador, obsceno, ofensivo, sexualmente explícito ou prejudicial a menores;</li>
                <li>livres de conteúdo discriminatório;</li>
                <li>conformes às leis e regulamentos aplicáveis;</li>
                <li>livres de links para websites que violem estes termos.</li>
              </ul>
            </div>
            <p>
              <strong className="text-[#202020] font-semibold">9.4</strong> O Telegram Business não será responsável por questões decorrentes da violação das cláusulas 5, 6, 7 e 8 pelo Participante e poderá exigir indenização pelas perdas decorrentes do incumprimento, nos termos deste Contrato.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
