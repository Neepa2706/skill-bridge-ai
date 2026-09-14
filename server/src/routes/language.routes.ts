import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { processConversationTurn, evaluateConversation } from '../services/ai/languageConversationEngine.js';

const router = Router();

// Get Available Language Tracks
router.get('/tracks', authenticateToken, (req: Request, res: Response): void => {
  try {
    const tracks = queryAll('SELECT * FROM language_tracks');
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch tracks.' });
  }
});

// Start Language Conversation Session
router.post('/conversation/start', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { languageCode, topic } = req.body; // 'en' | 'ja' | 'de'

    const code = ['en', 'ja', 'de'].includes(languageCode) ? languageCode : 'en';
    const convId = `conv-${uuidv4()}`;

    const defaultTopic = topic || (code === 'ja' ? 'ビジネス自己紹介 (Business Self-Introduction)' : code === 'de' ? 'Vorstellungsgespräch (Job Interview)' : 'Career Aspirations & Technical Background');

    execute(
      `INSERT INTO conversations (id, user_id, language_code, title, topic, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [convId, userId, code, `${code.toUpperCase()} Practice: ${defaultTopic}`, defaultTopic]
    );

    // Initial greeting from AI
    let initialGreeting = 'Hello! I am your SkillBridge English Coach. Tell me about yourself and your target career role!';
    if (code === 'ja') {
      initialGreeting = '初めまして！SkillBridgeの日本語AIパートナーです。自己紹介と、どのような仕事を目指しているか教えていただけますか？ (Nice to meet you! Tell me about yourself and your career goals.)';
    } else if (code === 'de') {
      initialGreeting = 'Guten Tag! Ich bin dein SkillBridge Deutsch-Sprachpartner. Erzähle mir bitte kurz über deinen Hintergrund und deine Ziele!';
    }

    const msgId = `cmsg-${uuidv4()}`;
    execute(
      `INSERT INTO conversation_messages (id, conversation_id, sender, message_text)
       VALUES (?, ?, 'ai', ?)`,
      [msgId, convId, initialGreeting]
    );

    res.json({
      conversationId: convId,
      languageCode: code,
      topic: defaultTopic,
      initialMessage: {
        id: msgId,
        sender: 'ai',
        messageText: initialGreeting,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start conversation.' });
  }
});

// Send Message in Conversation (AI Dialogue Partner Turn)
router.post('/conversation/message', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, messageText } = req.body;

    if (!conversationId || !messageText) {
      res.status(400).json({ error: 'Conversation ID and message text are required.' });
      return;
    }

    const conv = queryOne('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation session not found.' });
      return;
    }

    // Save User message
    const userMsgId = `cmsg-${uuidv4()}`;
    execute(
      `INSERT INTO conversation_messages (id, conversation_id, sender, message_text)
       VALUES (?, ?, 'user', ?)`,
      [userMsgId, conversationId, messageText]
    );

    // Fetch recent dialogue history
    const history = queryAll(
      `SELECT sender, message_text FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId]
    ).map(m => ({ sender: m.sender as 'ai' | 'user', message: m.message_text }));

    // AI Turn Generation
    const aiTurn = await processConversationTurn({
      languageCode: conv.language_code as 'en' | 'ja' | 'de',
      userMessage: messageText,
      conversationHistory: history
    });

    // Save AI message with grammar and vocabulary feedback notes
    const aiMsgId = `cmsg-${uuidv4()}`;
    execute(
      `INSERT INTO conversation_messages (id, conversation_id, sender, message_text, grammar_notes, vocabulary_notes)
       VALUES (?, ?, 'ai', ?, ?, ?)`,
      [aiMsgId, conversationId, aiTurn.replyText, aiTurn.grammarCorrection || null, aiTurn.vocabularyNote || null]
    );

    res.json({
      userMessage: {
        id: userMsgId,
        sender: 'user',
        messageText
      },
      aiMessage: {
        id: aiMsgId,
        sender: 'ai',
        messageText: aiTurn.replyText,
        grammarCorrection: aiTurn.grammarCorrection,
        vocabularyNote: aiTurn.vocabularyNote,
        relevanceScore: aiTurn.relevanceScore
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process message.' });
  }
});

// Finish & Evaluate Conversation Session
router.post('/conversation/evaluate', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { conversationId } = req.body;

    const conv = queryOne('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) {
      res.status(404).json({ error: 'Conversation session not found.' });
      return;
    }

    const messages = queryAll(
      `SELECT sender, message_text as message FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId]
    );

    const scorecard = evaluateConversation(messages);

    execute(
      `UPDATE conversations 
       SET status = 'completed',
           fluency_score = ?,
           grammar_score = ?,
           vocabulary_score = ?,
           overall_score = ?,
           feedback_json = ?,
           ended_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        scorecard.fluencyScore,
        scorecard.grammarScore,
        scorecard.vocabularyScore,
        scorecard.overallScore,
        JSON.stringify(scorecard),
        conversationId
      ]
    );

    res.json({
      conversationId,
      status: 'completed',
      scorecard
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to evaluate conversation.' });
  }
});

// Get Conversation History
router.get('/conversation/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const convId = req.params.id;
    const conv = queryOne('SELECT * FROM conversations WHERE id = ?', [convId]);

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const messages = queryAll(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convId]
    );

    res.json({
      ...conv,
      messages
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load conversation.' });
  }
});

export default router;
