import { z } from 'zod';
import { ErroApi } from './errors';

/** ISO `YYYY-MM-DD`, data real e no passado (P0 item 5). */
export const dataNascimentoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .refine((valor) => {
    const [ano, mes, dia] = valor.split('-').map(Number);
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    return (
      d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
    );
  }, 'Essa data não existe.')
  .refine((valor) => new Date(`${valor}T00:00:00Z`).getTime() < Date.now(), {
    message: 'A data de nascimento precisa estar no passado.',
  });

/** `HH:MM` em 24h. */
export const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM em 24 horas.');

export const dadosNascimentoSchema = z.object({
  data_nascimento: dataNascimentoSchema,
  hora_nascimento: horaSchema,
  hora_desconhecida: z.boolean(),
  cidade: z.string().trim().min(1, 'Informe a cidade.'),
  pais: z.string().trim().min(1, 'Informe o país.'),
});

export const apenasDataSchema = z.object({
  data_nascimento: dataNascimentoSchema,
});

/** E-mail simples (Supabase Auth valida de novo no servidor dele). */
export const emailSchema = z.string().trim().toLowerCase().email('Informe um e-mail válido.');

/** Mínimo exigido pelo Supabase Auth por padrão. */
export const senhaSchema = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.');

export const cadastroSchema = dadosNascimentoSchema.extend({
  email: emailSchema,
  senha: senhaSchema,
  nome: z.string().trim().min(1, 'Informe o nome.'),
});

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha.'),
});

export const conversaSchema = z.object({
  mensagem: z.string().trim().min(1, 'Escreva uma mensagem.').max(4000, 'Mensagem muito longa.'),
});

/** Lê o corpo JSON e valida, convertendo falha em ErroApi ENTRADA_INVALIDA. */
export async function lerCorpo<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    throw new ErroApi('ENTRADA_INVALIDA', 'Corpo da requisição não é JSON válido.', 400);
  }

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    const primeiro = resultado.error.errors[0];
    throw new ErroApi(
      'ENTRADA_INVALIDA',
      primeiro?.message ?? 'Dados inválidos.',
      400,
      resultado.error.flatten(),
    );
  }
  return resultado.data;
}
