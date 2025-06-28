// src/router.js
const nicho = require("./profiles/nicho");
const avatar = require("./profiles/avatar");
const roma = require("./profiles/roma");
const { getStudent, setAgent } = require("./utils/db");

// -----------------------------------------------------------------------------
// 1. Detectar intenção — usa palavra-chave ou mantém o último agente
// -----------------------------------------------------------------------------
function detectIntent(text, lastAgent = null) {
  const t = text.toLowerCase();

  if (/nicho|mercado|segmento/.test(t)) return "nicho";
  if (/avatar|persona|público/.test(t)) return "avatar";
  if (/roma|promessa|transformação/.test(t)) return "roma";

  // se não detectou nada novo, continua no mesmo agente
  if (lastAgent) return lastAgent;

  return "fallback";
}

// -----------------------------------------------------------------------------
// 2. Roteador principal
// -----------------------------------------------------------------------------
async function route(question, phoneJid) {
  return new Promise((resolve) => {
    getStudent(phoneJid, async (err, aluno) => {
      if (err || !aluno) {
        return resolve(
          "Erro de sessão. Tente sair e entrar novamente ou fale com o suporte.",
        );
      }

      // Detecta intenção considerando o último agente salvo
      const intent = detectIntent(question, aluno.last_agent);

      // Se mudou de assunto, zera o passo
      let step = aluno.agent_step;
      if (intent !== aluno.last_agent) {
        step = 0;
        setAgent(phoneJid, intent, step);
      }

      let resposta;
      switch (intent) {
        case "nicho":
          resposta = await nicho.handle(question, phoneJid, step);
          break;
        case "avatar":
          resposta = await avatar.handle(question, phoneJid, step);
          break;
        case "roma":
          resposta = await roma.handle(question, phoneJid, step);
          break;
        default:
          resposta =
            "Desculpe, ainda não entendi. Tente reformular ou pergunte sobre nicho, avatar ou roma.";
      }
      resolve(resposta);
    });
  });
}

module.exports = { route };
