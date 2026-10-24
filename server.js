import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Gemini client (se manca la key, il sito funziona in "modalità demo")
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Rotta per la pagina principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload su disco temporaneo: NON consuma la RAM di Render
const upload = multer({
  dest: path.join(os.tmpdir(), "tiktok-ai-uploads"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Helper: chiamata Gemini base ----------
async function geminiJSON(prompt) {
  if (!ai) return mockJSON(prompt);
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  return JSON.parse(res.text);
}

// ---------- Endpoint 1: 10 idee video ----------
app.post("/api/ideas", async (req, res) => {
  const { argomento } = req.body;
  if (!argomento) return res.status(400).json({ error: "Manca l'argomento" });

  const prompt = `Sei un esperto di contenuti TikTok virali.
Argomento: "${argomento}"
Genera ESATTAMENTE 10 idee di video TikTok potenzialmente virali.
Rispondi SOLO con JSON valido in questo formato:
{ "idee": [ { "titolo": "...", "hook": "prima frase dei primi 3 secondi", "perche_funziona": "breve motivazione" } ] }`;

  try {
    res.json(await geminiJSON(prompt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Endpoint 2: script 30 secondi ----------
app.post("/api/script", async (req, res) => {
  const { idea } = req.body;
  if (!idea) return res.status(400).json({ error: "Manca l'idea" });

  const prompt = `Sei uno scrittore di script virali per TikTok.
Idea del video: "${idea}"
Scrivi uno script da 30 secondi, ritmato, con hook nei primi 3 secondi.
Rispondi SOLO con JSON:
{ "hook": "...", "scena_per_scena": [ { "secondi": "0-3", "testo": "...", "visual": "..." } ], "cta_finale": "..." }`;

  try {
    res.json(await geminiJSON(prompt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Endpoint 3: caption + hashtag ----------
app.post("/api/caption", async (req, res) => {
  const { argomento } = req.body;
  if (!argomento) return res.status(400).json({ error: "Manca l'argomento" });

  const prompt = `Genera una didascalia TikTok virale per: "${argomento}"
Rispondi SOLO con JSON:
{ "caption": "...", "hashtag": ["#...", "#..."], "sottotitoli": ["...", "..."] }`;

  try {
    res.json(await geminiJSON(prompt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Endpoint 4: ANALISI VIDEO ----------
app.post("/api/analyze", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nessun video caricato" });
  if (!ai) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.json(mockAnalysis());
  }

  try {
    // 1) Upload su Gemini File API (non usa RAM del server)
    const file = await ai.files.upload({
      file: req.file.path,
      config: { mimeType: req.file.mimetype },
    });

    // 2) Attendi che Gemini processi il video
    let info = await ai.files.get({ name: file.name });
    let attempts = 0;
    while (info.state === "PROCESSING" && attempts < 60) {
      await sleep(2000);
      info = await ai.files.get({ name: file.name });
      attempts++;
    }
    if (info.state === "FAILED") throw new Error("Elaborazione video fallita");

    // 3) Chiedi l'analisi virale
    const prompt = `Analizza questo video TikTok e produci un report in italiano
per renderlo virale. Rispondi SOLO con JSON valido:
{
  "punteggio_viralita": 0,
  "punti_di_forza": ["..."],
  "punti_deboli": ["..."],
  "analisi_hook": "cosa succede nei primi 3 secondi e come migliorarlo",
  "suggerimenti_concreti": ["..."],
  "nuovo_hook_suggerito": "...",
  "caption_suggerita": "...",
  "hashtag_suggeriti": ["#...", "#..."]
}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        { fileData: { fileUri: info.uri, mimeType: info.mimeType } },
        { text: prompt },
      ],
      config: { responseMimeType: "application/json" },
    });

    // 4) Cleanup
    await ai.files.delete({ name: file.name }).catch(() => {});
    res.json(JSON.parse(response.text));
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});

// ---------- Health check ----------
app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`✅ Server su http://localhost:${PORT}`));

// ---------- MOCK (funziona anche senza GEMINI_API_KEY) ----------
function mockJSON(prompt) {
  if (prompt.includes("10 idee"))
    return {
      idee: Array.from({ length: 10 }, (_, i) => ({
        titolo: `Idea demo #${i + 1}`,
        hook: "Aspetta, non scorri!",
        perche_funziona: "Pattern interrupt",
      })),
    };
  if (prompt.includes("script"))
    return {
      hook: "Hook demo",
      scena_per_scena: [{ secondi: "0-3", testo: "demo", visual: "demo" }],
      cta_finale: "Segui per altri!",
    };
  if (prompt.includes("didascalia"))
    return { caption: "Demo caption", hashtag: ["#fyp", "#viral"], sottotitoli: ["Demo"] };
  return {};
}

function mockAnalysis() {
  return {
    punteggio_viralita: 65,
    punti_di_forza: ["Hook chiaro", "Buona luce"],
    punti_deboli: ["Intro troppo lenta", "Audio basso"],
    analisi_hook: "Nei primi 3 secondi manca una promessa chiara.",
    suggerimenti_concreti: [
      "Parti con una domanda provocatoria",
      "Taglia i primi 2 secondi morti",
      "Aggiungi sottotitoli animati",
    ],
    nuovo_hook_suggerito: "Nessuno ti dice questo su...",
    caption_suggerita: "Guarda fino alla fine 👀",
    hashtag_suggeriti: ["#fyp", "#perte", "#viral"],
  };
}