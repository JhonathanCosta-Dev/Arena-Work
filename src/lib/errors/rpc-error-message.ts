const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Sua sessão expirou. Entre novamente.',
  USER_INACTIVE: 'Seu acesso está inativo.',
  ADMIN_REQUIRED: 'Apenas administradores podem fazer isso.',
  SELF_MATCH_NOT_ALLOWED: 'Você não pode registrar uma partida contra si mesmo.',
  OPPONENT_NOT_AVAILABLE: 'Esse adversário não está disponível.',
  INVALID_SCORE: 'Use um placar válido: 2×0, 2×1, 1×0 (ou invertido) ou 1×1 para empate.',
  NO_ACTIVE_SEASON: 'Não há temporada ativa no momento. Fale com um administrador.',
  SEASON_NOT_STARTED: 'A temporada ainda não começou. Confira a data de início na home.',
  SEASON_ENDED: 'O prazo da temporada terminou. Aguarde o administrador abrir a próxima.',
  MATCH_NOT_FOUND: 'Partida não encontrada.',
  MATCH_NOT_PENDING: 'Essa partida não está mais aguardando confirmação.',
  MATCH_NOT_DISPUTED: 'Essa partida não está em disputa.',
  CREATOR_CANNOT_CONFIRM: 'Quem registrou não pode confirmar a própria partida.',
  CREATOR_CANNOT_DISPUTE_OWN_REQUEST: 'Quem registrou não pode contestar a própria partida.',
  NOT_A_PARTICIPANT: 'Você não participou dessa partida.',
  REASON_TOO_LONG: 'O motivo pode ter no máximo 500 caracteres.',
  INVALID_RESOLUTION: 'Resolução inválida.',
  INVALID_SEASON_NAME: 'Informe um nome de até 80 caracteres.',
  INVALID_SEASON_DATES: 'Informe as datas de início e fim.',
  SEASON_END_BEFORE_START: 'A data de fim precisa ser igual ou posterior à de início.',
  INVALID_TIMEZONE: 'Fuso horário do app inválido.',
  SEASON_NOT_FOUND: 'Temporada não encontrada.',
  SEASON_FINISHED: 'Temporadas encerradas não podem ser editadas.',
  SEASON_NOT_SCHEDULED: 'Só temporadas agendadas podem ser ativadas.',
  SEASON_NOT_ACTIVE: 'Só a temporada ativa pode ser encerrada.',
  ANOTHER_SEASON_ACTIVE: 'Já existe uma temporada ativa. Encerre-a antes de ativar outra.',
  CANNOT_CHANGE_OWN_ACCESS: 'Você não pode alterar o seu próprio acesso.',
  PROFILE_NOT_FOUND: 'Jogador não encontrado.',
  INVALID_PROFILE_NAME: 'O nome precisa ter entre 2 e 120 caracteres.',
  INVALID_COMPANY_NAME: 'O nome da empresa pode ter até 80 caracteres.',
  INVALID_IMAGE_PATH: 'Imagem inválida. Envie novamente.',
};

export function rpcErrorMessage(
  error: { message: string } | null | undefined,
  fallback = 'Não foi possível concluir a ação.',
) {
  if (!error) return fallback;
  return messages[error.message] ?? fallback;
}
