import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3000;

// Batasi upload maksimal 20MB untuk mencegah kehabisan memori
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.5-flash-lite";

// Middleware
app.use(cors());
app.use(express.json());

// 1. Root Endpoint
app.get('/', (req, res) => {
  res.send('Hello World!!!');
});

// 2. Generate Text
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Field 'prompt' wajib diisi berupa teks." });
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 3. Generate from Image
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File gambar ('image') wajib diunggah." });
    }

    const { prompt } = req.body;
    const base64Image = req.file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Deskripsikan atau jelaskan isi gambar berikut.", type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 4. Generate from Document
app.post("/generate-from-document", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File dokumen ('document') wajib diunggah." });
    }

    const { prompt } = req.body;
    const base64Document = req.file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buat ringkasan dari dokumen berikut.", type: "text" },
        { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 5. Generate from Audio
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File audio ('audio') wajib diunggah." });
    }

    const { prompt } = req.body;
    const base64Audio = req.file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buatkan transkrip dari rekaman berikut.", type: "text" },
        { inlineData: { data: base64Audio, mimeType: req.file.mimetype } }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 6. Chatbot Multi-Turn API
app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body;

  if (!Array.isArray(conversation) || conversation.length === 0) {
    return res.status(400).json({ error: "Field 'conversation' harus berupa array dan tidak boleh kosong." });
  }

  try {
    const contents = conversation.map(({ role, text }) => ({
      role: role === 'model' ? 'model' : 'user',
      parts: [{ text: text || '' }]
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.9,
        systemInstruction: `Kamu adalah Chatbot AI dari sebuah SD Negeri 06 Kp. Makasar, Jakarta Timur.
            Jawab setiap pertanyaan dengan simple dan mudah dipahami. 
            Jika pertanyaan bersifat memberikan informasi maka berikan jawaban dengan menggunakan format markdown.
            Jika pertanyaan bersifat hiburan atau random, jawab dengan singkat dan jelas.
            `,
      },
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Jalankan server di akhir setelah seluruh rute terdaftar
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));