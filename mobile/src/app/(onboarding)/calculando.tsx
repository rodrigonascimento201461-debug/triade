import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Botao, Regua, Tela, Texto } from '@/components';
import { usePerfil } from '@/state/PerfilContext';
import { useRascunho } from '@/state/RascunhoOnboarding';
import { cores, espaco } from '@/theme';

/**
 * Tela de cálculo/cadastro. Fundo inteiro accent, texto branco.
 *
 * Uma chamada só: `POST /api/auth/cadastro` cria a conta E calcula o mapa
 * (os 3 sistemas) numa tacada. Três desfechos:
 *
 * - `status === 'pronto'`: mapa veio calculado → segue para Hoje.
 * - `status === 'mapa_pendente'`: CONTA CRIADA, mas o backend não conseguiu
 *   calcular (ex. cidade não encontrada) e engoliu o erro silenciosamente —
 *   `mapa: null` com 201, não é uma falha de requisição. Não é justo travar o
 *   usuário aqui: a conta existe, então seguimos para Hoje também, mas essa
 *   tela mostra um passo intermediário oferecendo "Tentar calcular agora"
 *   antes de ir, porque o usuário já está com a atenção nisso.
 * - `status === 'erro'`: a REQUISIÇÃO falhou (rede, e-mail já cadastrado,
 *   entrada inválida). Aqui sim é uma tela de falha de verdade.
 */
export default function Calculando() {
  const router = useRouter();
  const { rascunho } = useRascunho();
  const { status, erro, recalculo, cadastrar, tentarRecalcularMapa } = usePerfil();
  const jaDisparou = useRef(false);

  useEffect(() => {
    if (jaDisparou.current) return;
    jaDisparou.current = true;

    void cadastrar({
      nome: rascunho.nome,
      data_nascimento: rascunho.data_nascimento,
      hora_nascimento: rascunho.hora_nascimento,
      hora_desconhecida: rascunho.hora_desconhecida,
      cidade: rascunho.cidade,
      pais: rascunho.pais,
      email: rascunho.email,
      senha: rascunho.senha,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'pronto') {
      router.replace('/(tabs)/hoje');
    }
    // 'mapa_pendente' NÃO redireciona sozinho — fica na tela oferecendo retry
    // (ver JSX abaixo). O usuário decide quando seguir.
  }, [status, router]);

  const falhou = status === 'erro';
  const mapaPendente = status === 'mapa_pendente';
  const emailJaCadastrado = falhou && erro?.codigo === 'EMAIL_JA_CADASTRADO';

  function tentarDeNovo() {
    jaDisparou.current = false;
    void cadastrar({
      nome: rascunho.nome,
      data_nascimento: rascunho.data_nascimento,
      hora_nascimento: rascunho.hora_nascimento,
      hora_desconhecida: rascunho.hora_desconhecida,
      cidade: rascunho.cidade,
      pais: rascunho.pais,
      email: rascunho.email,
      senha: rascunho.senha,
    });
  }

  return (
    <Tela fixa fundo={cores.accent}>
      <Texto variante="kicker" cor={cores.sobreAccent}>
        {falhou ? 'NÃO DEU CERTO' : mapaPendente ? 'CONTA CRIADA' : 'CALCULANDO'}
      </Texto>
      <Regua
        cor={cores.sobreAccent}
        style={{ marginTop: espaco.md, marginBottom: espaco.xl }}
      />

      <Texto variante="tituloCalculando">
        {falhou
          ? (erro?.mensagem ?? 'Algo deu errado no caminho.')
          : mapaPendente
            ? 'Sua conta já existe. Ainda não conseguimos calcular seu mapa.'
            : 'Lendo seu nascimento em três tradições.'}
      </Texto>

      {falhou ? (
        <View style={{ marginTop: espaco.xxl, gap: espaco.md }}>
          {emailJaCadastrado ? (
            <Botao
              rotulo="Entrar"
              variante="preto"
              onPress={() => router.replace('/entrar')}
              expandir
            />
          ) : (
            <Botao rotulo="Tentar de novo" variante="preto" onPress={tentarDeNovo} expandir />
          )}
          <Botao
            rotulo="Revisar meus dados"
            variante="outline"
            onPress={() => router.replace('/(onboarding)/passo-1')}
            expandir
          />
        </View>
      ) : null}

      {mapaPendente ? (
        <View style={{ marginTop: espaco.xxl, gap: espaco.md }}>
          <Botao
            rotulo={recalculo.status === 'calculando' ? 'Calculando…' : 'Tentar calcular agora'}
            variante="preto"
            desabilitado={recalculo.status === 'calculando'}
            onPress={() => void tentarRecalcularMapa()}
            expandir
          />
          <Botao
            rotulo="Ir para o app"
            variante="outline"
            onPress={() => router.replace('/(tabs)/hoje')}
            expandir
          />
          {recalculo.status === 'erro' && recalculo.mensagem ? (
            <Texto variante="corpoPoster">{recalculo.mensagem}</Texto>
          ) : null}
        </View>
      ) : null}
    </Tela>
  );
}
