/**
 * RAG Kit — Upload API Endpoint
 *
 * Скопируй в: api/upload.js
 * Настрой: ADMIN_PASSWORD
 */

import { createUploadService } from './lib/rag-kit/index.js';

// ============================================================
// ИНИЦИАЛИЗАЦИЯ UPLOAD SERVICE
// ============================================================

const uploader = createUploadService();

// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, title, content, source, category } = req.body;

    // ============================================================
    // АВТОРИЗАЦИЯ
    // ============================================================
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // ============================================================
    // ВАЛИДАЦИЯ
    // ============================================================
    if (!title || !content) {
      return res.status(400).json({ error: 'Требуется title и content' });
    }

    console.log(`[Upload] Uploading: "${title}" (${content.length} chars)`);

    // ============================================================
    // ЗАГРУЗКА
    // ============================================================
    const result = await uploader.upload({
      title,
      content,
      source: source || title,
      category: category || 'document',
    });

    console.log(`[Upload] Success: ${result.documentId}`);

    res.json({
      success: true,
      documentId: result.documentId,
      title: result.title,
      message: `Документ "${title}" успешно загружен`,
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({
      error: 'Ошибка загрузки документа',
      details: error.message,
    });
  }
}
