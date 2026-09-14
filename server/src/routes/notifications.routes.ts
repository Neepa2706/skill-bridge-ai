import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { queryAll, queryOne, execute } from '../db/database.js';

const router = Router();

// ============================================================================
// STEP 17: NOTIFICATIONS & PREFERENCES MANAGEMENT
// ============================================================================

/**
 * 17.1 Get User Notifications with unread count
 * GET /api/notifications
 */
router.get('/', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const notifications = queryAll<any>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      success: true,
      message: 'Notifications retrieved',
      data: {
        notifications,
        unreadCount
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 17.2 Mark Single Notification as Read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const notifId = req.params.id;

    execute(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [notifId, userId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { id: notifId, isRead: true },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update notification', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 17.3 Mark All Notifications as Read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    execute(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { allRead: true },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 17.4 Delete Notification
 * DELETE /api/notifications/:id
 */
router.delete('/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const notifId = req.params.id;

    execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notifId, userId]);

    res.json({
      success: true,
      message: 'Notification deleted',
      data: { id: notifId },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete notification', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 17.5 Get Notification Preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    let prefs = queryOne<any>('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);

    if (!prefs) {
      prefs = {
        userId,
        emailAlerts: 1,
        inAppAlerts: 1,
        opportunityAlerts: 1,
        interviewAlerts: 1,
        mentorshipAlerts: 1,
        systemAlerts: 1
      };
    }

    res.json({
      success: true,
      message: 'Notification preferences loaded',
      data: {
        userId,
        emailAlerts: !!prefs.email_alerts,
        inAppAlerts: prefs.in_app_alerts !== 0,
        opportunityAlerts: prefs.opportunity_alerts !== 0,
        interviewAlerts: prefs.interview_alerts !== 0,
        mentorshipAlerts: prefs.mentorship_alerts !== 0,
        systemAlerts: prefs.system_alerts !== 0
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch preferences', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 17.6 Update Notification Preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const {
      emailAlerts = true,
      inAppAlerts = true,
      opportunityAlerts = true,
      interviewAlerts = true,
      mentorshipAlerts = true,
      systemAlerts = true
    } = req.body;

    const existing = queryOne<any>('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
    if (existing) {
      execute(
        `UPDATE notification_preferences SET
          email_alerts = ?, in_app_alerts = ?, opportunity_alerts = ?,
          interview_alerts = ?, mentorship_alerts = ?, system_alerts = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [
          emailAlerts ? 1 : 0,
          inAppAlerts ? 1 : 0,
          opportunityAlerts ? 1 : 0,
          interviewAlerts ? 1 : 0,
          mentorshipAlerts ? 1 : 0,
          systemAlerts ? 1 : 0,
          userId
        ]
      );
    } else {
      execute(
        `INSERT INTO notification_preferences (
          id, user_id, email_alerts, in_app_alerts, opportunity_alerts,
          interview_alerts, mentorship_alerts, system_alerts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `pref-${uuidv4()}`,
          userId,
          emailAlerts ? 1 : 0,
          inAppAlerts ? 1 : 0,
          opportunityAlerts ? 1 : 0,
          interviewAlerts ? 1 : 0,
          mentorshipAlerts ? 1 : 0,
          systemAlerts ? 1 : 0
        ]
      );
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        emailAlerts,
        inAppAlerts,
        opportunityAlerts,
        interviewAlerts,
        mentorshipAlerts,
        systemAlerts
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update preferences', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

export default router;
