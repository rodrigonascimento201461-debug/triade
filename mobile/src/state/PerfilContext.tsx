import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapaOcidental, SignoChines, SistemaEgipcio, Triade } from '@shared/types/astro';
import type { AuthResponse, CadastroRequest, CodigoErro, LoginRequest, Perfil, SessaoAuth } from '@shared/types/api';
import { ErroTriade, api, definirToken } from '@/api/client';

/**
 * Estado central do app: sessão (Supabase Auth), perfil e as três leituras
 * calculadas.
 *
 * REGRA P0: toda tela lê os signos DAQUI. Nenhum nome de signo pode ser escrito
 * como literal em código de UI — se a data mudar, a tela muda junto.
 *
 * Persistência: `AsyncStorage` guarda sessão + perfil + mapa. No cold start, o
 * app tenta hidratar de lá ANTES de decidir entre onboarding e Home (ver
 * `app/index.tsx`, status `'hidratando'`). Não há endpoint `/me`: o token
 * hidratado não é validado contra o servidor até a próxima chamada
 * autenticada — se vier 401, tratamos como sessão expirada.
 */

const CHAVE_STORAGE = '@triade/sessao-v1';

export type StatusConta =
  | 'vazio'
  | 'hidratando'
  | 'calculando'
  | 'pronto'
  | 'mapa_pendente'
  | 'erro';

interface Leituras {
  ocidental: MapaOcidental | null;
  chines: SignoChines | null;
  egipcio: SistemaEgipcio | null;
}

interface EstadoPersistido {
  sessao: SessaoAuth;
  perfil: Perfil;
  mapa: Triade | null;
}

type StatusRecalculo = 'ocioso' | 'calculando' | 'erro';

interface ContextoPerfil {
  sessao: SessaoAuth | null;
  perfil: Perfil | null;
  mapa: Triade | null;
  leituras: Leituras;
  status: StatusConta;
  erro: { codigo: CodigoErro; mensagem: string } | null;
  /** Nome curto para o "Olá, {primeiroNome}." da home. */
  primeiroNome: string;
  /** `hora_confiavel === false` em qualquer lugar que dependa da hora. */
  horaDuvidosa: boolean;
  /** Cria a conta (dados do onboarding + credenciais). Nunca lança — lê `status`/`erro`. */
  cadastrar: (dados: CadastroRequest) => Promise<void>;
  /** Login com e-mail/senha. Nunca lança — lê `status`/`erro`. */
  entrar: (dados: LoginRequest) => Promise<void>;
  /**
   * Retry client-side quando o cadastro criou a conta mas não conseguiu
   * calcular o mapa (`mapa: null`). Usa os endpoints `/api/calcular/*` (sem
   * auth, mesmo padrão da Sinastria) com os dados de nascimento já salvos no
   * perfil. PENDÊNCIA: isso atualiza só o estado local (+ AsyncStorage), não
   * persiste em `mapas_natais` — não existe hoje um endpoint autenticado de
   * "recalcular e salvar". Um login futuro em outro aparelho ainda viria com
   * `mapa: null` até esse endpoint existir no backend.
   */
  tentarRecalcularMapa: () => Promise<void>;
  recalculo: { status: StatusRecalculo; mensagem?: string };
  /** Alterna "hora não informada" localmente (não recalcula nem persiste — TODO conhecido). */
  alternarHoraDesconhecida: () => void;
  /** Limpa sessão + AsyncStorage. Usada pela linha "Sair" do Perfil. */
  sair: () => Promise<void>;
}

const Ctx = createContext<ContextoPerfil | null>(null);

const SEM_LEITURAS: Leituras = { ocidental: null, chines: null, egipcio: null };

function triadeParaLeituras(mapa: Triade | null): Leituras {
  if (!mapa) return SEM_LEITURAS;
  return { ocidental: mapa.ocidental, chines: mapa.chines, egipcio: mapa.egipcio };
}

async function lerEstadoPersistido(): Promise<EstadoPersistido | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return null;
    return JSON.parse(bruto) as EstadoPersistido;
  } catch {
    return null;
  }
}

async function salvarEstadoPersistido(estado: EstadoPersistido): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
  } catch {
    // Persistência é conveniência, não fonte da verdade em memória — não bloqueia o fluxo.
  }
}

async function limparEstadoPersistido(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE_STORAGE);
  } catch {
    // idem
  }
}

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<SessaoAuth | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [mapa, setMapa] = useState<Triade | null>(null);
  const [status, setStatus] = useState<StatusConta>('hidratando');
  const [erro, setErro] = useState<ContextoPerfil['erro']>(null);
  const [recalculo, setRecalculo] = useState<ContextoPerfil['recalculo']>({ status: 'ocioso' });

  // O client.ts guarda o token fora do React (é ele quem manda o header
  // Authorization); qualquer mudança de sessão precisa chegar até lá.
  useEffect(() => {
    definirToken(sessao?.access_token ?? null);
  }, [sessao]);

  // Hidratação: tenta carregar do AsyncStorage antes de decidir onboarding x Home.
  useEffect(() => {
    let cancelado = false;
    lerEstadoPersistido().then((salvo) => {
      if (cancelado) return;
      if (salvo) {
        setSessao(salvo.sessao);
        setPerfil(salvo.perfil);
        setMapa(salvo.mapa);
        setStatus(salvo.mapa ? 'pronto' : 'mapa_pendente');
      } else {
        setStatus('vazio');
      }
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const aplicarResposta = useCallback(async (resposta: AuthResponse) => {
    setSessao(resposta.sessao);
    setPerfil(resposta.perfil);
    setMapa(resposta.mapa);
    setStatus(resposta.mapa ? 'pronto' : 'mapa_pendente');
    setErro(null);
    await salvarEstadoPersistido({
      sessao: resposta.sessao,
      perfil: resposta.perfil,
      mapa: resposta.mapa,
    });
  }, []);

  const cadastrar = useCallback(
    async (dados: CadastroRequest) => {
      setStatus('calculando');
      setErro(null);
      try {
        const resposta = await api.cadastro(dados);
        await aplicarResposta(resposta);
      } catch (e) {
        const err =
          e instanceof ErroTriade
            ? { codigo: e.codigo, mensagem: e.message }
            : { codigo: 'ERRO_INTERNO' as CodigoErro, mensagem: 'Algo deu errado.' };
        setErro(err);
        setStatus('erro');
      }
    },
    [aplicarResposta],
  );

  const entrar = useCallback(
    async (dados: LoginRequest) => {
      setStatus('calculando');
      setErro(null);
      try {
        const resposta = await api.login(dados);
        await aplicarResposta(resposta);
      } catch (e) {
        const err =
          e instanceof ErroTriade
            ? { codigo: e.codigo, mensagem: e.message }
            : { codigo: 'ERRO_INTERNO' as CodigoErro, mensagem: 'Algo deu errado.' };
        setErro(err);
        setStatus('erro');
      }
    },
    [aplicarResposta],
  );

  const tentarRecalcularMapa = useCallback(async () => {
    if (!perfil || !sessao) return;
    setRecalculo({ status: 'calculando' });
    try {
      const [ocidental, chines, egipcio] = await Promise.all([
        api.mapaOcidental({
          data_nascimento: perfil.data_nascimento,
          hora_nascimento: perfil.hora_nascimento ?? '12:00',
          hora_desconhecida: perfil.hora_desconhecida,
          cidade: perfil.cidade,
          pais: perfil.pais,
        }),
        api.signoChines(perfil.data_nascimento),
        api.sistemaEgipcio(perfil.data_nascimento),
      ]);
      const novoMapa: Triade = { ocidental, chines, egipcio };
      setMapa(novoMapa);
      setStatus('pronto');
      setRecalculo({ status: 'ocioso' });
      await salvarEstadoPersistido({ sessao, perfil, mapa: novoMapa });
    } catch (e) {
      setRecalculo({
        status: 'erro',
        mensagem: e instanceof ErroTriade ? e.message : 'Não conseguimos calcular seu mapa agora.',
      });
    }
  }, [perfil, sessao]);

  const alternarHoraDesconhecida = useCallback(() => {
    setPerfil((atual) => (atual ? { ...atual, hora_desconhecida: !atual.hora_desconhecida } : atual));
    // TODO: recalcular o mapa ocidental — ascendente e casas dependem da hora.
  }, []);

  const sair = useCallback(async () => {
    setSessao(null);
    setPerfil(null);
    setMapa(null);
    setStatus('vazio');
    setErro(null);
    setRecalculo({ status: 'ocioso' });
    definirToken(null);
    await limparEstadoPersistido();
  }, []);

  const valor = useMemo<ContextoPerfil>(
    () => ({
      sessao,
      perfil,
      mapa,
      leituras: triadeParaLeituras(mapa),
      status,
      erro,
      primeiroNome: perfil?.nome?.trim().split(/\s+/)[0] ?? '',
      horaDuvidosa: mapa?.ocidental.hora_confiavel === false || perfil?.hora_desconhecida === true,
      cadastrar,
      entrar,
      tentarRecalcularMapa,
      recalculo,
      alternarHoraDesconhecida,
      sair,
    }),
    [
      sessao,
      perfil,
      mapa,
      status,
      erro,
      cadastrar,
      entrar,
      tentarRecalcularMapa,
      recalculo,
      alternarHoraDesconhecida,
      sair,
    ],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePerfil(): ContextoPerfil {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePerfil precisa estar dentro de <PerfilProvider>.');
  return ctx;
}
