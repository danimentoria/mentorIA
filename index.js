// src/index.js – versão Web

require("dotenv").config();
const express = require("express");
const path = require("path");
const { OpenAI } = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");
const mensagens = require("./mensagens");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

// Servidor ativo
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Detecta o agente
function detectarAgente(pergunta) {
  const texto = pergunta.toLowerCase();
  if (texto.includes("nicho")) return "nicho";
  if (texto.includes("avatar")) return "avatar";
  if (texto.includes("roma")) return "roma";
  if (texto.includes("funil")) return "funil";
  if (texto.includes("oferta")) return "oferta";
  if (texto.includes("copy")) return "copy";
  return "geral";
}

// Gera embedding
async function embedTexto(texto) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texto,
  });
  return embedding.data[0].embedding;
}

// Gera resposta inteligente com base no agente
async function respostaInteligente(pergunta) {
  const agente = detectarAgente(pergunta);
  try {
    const busca = await pineconeIndex.query({
      vector: await embedTexto(pergunta),
      topK: 5,
      includeMetadata: true,
      filter: { agent: agente },
    });

    const contexto =
      busca.matches?.map((m) => m.metadata?.conteudo).join("\n") || "";

    const resposta = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Você é um mentor de lançamentos digitais chamado MentorIA. Responda como especialista em ${agente}.`,
        },
        {
          role: "user",
          content: `Contexto:\n${contexto}\n\nPergunta: ${pergunta}`,
        },
      ],
    });

    return resposta.choices[0].message.content.trim();
  } catch (err) {
    console.error("Erro ao gerar resposta inteligente:", err);
    return "Desculpe, houve um problema ao processar sua pergunta.";
  }
}

// Rota para o chat via site
app.post("/chat", async (req, res) => {
  const pergunta = req.body.pergunta || "";
  let resposta;

  if (pergunta === "1") resposta = mensagens.opcao1;
  else if (pergunta === "2") resposta = mensagens.opcao2;
  else if (pergunta === "3") resposta = mensagens.opcao3;
  else resposta = await respostaInteligente(pergunta);

  res.json({ resposta });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MentorIA web rodando na porta ${PORT}`);
});
