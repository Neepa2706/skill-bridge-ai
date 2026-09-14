import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gemini } from '../services/ai/gemini.client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

/**
 * Helper to update server/.env with new GEMINI_API_KEY
 */
function updateEnvFile(apiKey: string): void {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('GEMINI_API_KEY=')) {
        content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
      } else {
        content += `\nGEMINI_API_KEY=${apiKey}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
    }
  } catch (err) {
    console.warn('[AIConfig] Could not persist GEMINI_API_KEY to .env file:', err);
  }
}

/**
 * GET /api/ai/status
 * Check current AI integration status and model readiness
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  const isConfigured = gemini.hasApiKey();
  const rawKey = gemini.getApiKey();
  const keyPreview = rawKey ? `${rawKey.slice(0, 4)}...${rawKey.slice(-4)}` : null;

  res.json({
    configured: isConfigured,
    provider: 'Google Gemini',
    model: 'gemini-1.5-flash',
    keyPreview,
    message: isConfigured
      ? 'Gemini AI integration is active and ready for assessments.'
      : 'Gemini API key is not configured. Please supply GEMINI_API_KEY in server/.env or configure via settings.'
  });
});

/**
 * POST /api/ai/config
 * Set or test a runtime Gemini API key
 */
router.post('/config', async (req: Request, res: Response): Promise<void> => {
  const { apiKey, persist = true } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({
      success: false,
      error: 'A valid Gemini API key string is required.'
    });
    return;
  }

  const cleanKey = apiKey.trim();

  // Test the key against Gemini 1.5 Flash
  try {
    const originalKey = gemini.getApiKey();
    gemini.setApiKey(cleanKey);

    const testResult = await gemini.generateContentWithStatus('Respond with "OK" if connection is successful.');
    if (!testResult.text) {
      // Revert if test failed
      gemini.setApiKey(originalKey);
      res.status(400).json({
        success: false,
        error: `Gemini API key verification failed: ${testResult.error || 'No response'}`
      });
      return;
    }

    // Persist to .env if requested
    if (persist) {
      updateEnvFile(cleanKey);
      process.env.GEMINI_API_KEY = cleanKey;
    }

    res.json({
      success: true,
      message: 'Gemini API key successfully verified and activated!',
      model: 'gemini-1.5-flash',
      configured: true
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to configure Gemini API: ${err.message}`
    });
  }
});

export default router;
