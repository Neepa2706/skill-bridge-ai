import { Request } from 'express';

export interface SEBStatus {
  isSEB: boolean;
  userAgent: string;
  hasRequestHash: boolean;
  hasConfigKeyHash: boolean;
  version: string | null;
}

/**
 * Detects whether an incoming HTTP request originated from an authentic Safe Exam Browser client.
 * Official SEB sends a user agent string containing 'SEB/' or 'SafeExamBrowser'
 * and custom cryptographic headers 'X-SafeExamBrowser-RequestHash' / 'X-SafeExamBrowser-ConfigKeyHash'.
 */
export function detectSEB(req: Request): SEBStatus {
  const ua = (req.headers['user-agent'] as string) || '';
  const isSEBUa = ua.includes('SEB/') || ua.includes('SafeExamBrowser');
  const reqHash = !!req.headers['x-safeexambrowser-requesthash'];
  const configHash = !!req.headers['x-safeexambrowser-configkeyhash'];

  // Extract SEB version if present (e.g. SEB/3.4.1)
  const match = ua.match(/SEB\/([0-9.]+)/i);
  const version = match ? match[1] : null;

  return {
    isSEB: isSEBUa || reqHash || configHash,
    userAgent: ua,
    hasRequestHash: reqHash,
    hasConfigKeyHash: configHash,
    version
  };
}

/**
 * Generates an official Safe Exam Browser (.seb) XML configuration file (Apple property list format).
 * When opened by a student on Windows, macOS, or iOS with SEB installed,
 * it locks down the workstation and points directly to the assessment.
 */
export function generateSEBConfig(options?: {
  startUrl?: string;
  quitUrl?: string;
  examTitle?: string;
  quitPassword?: string;
}): string {
  const startUrl = options?.startUrl || 'http://localhost:5173/?mode=seb';
  const quitUrl = options?.quitUrl || 'http://localhost:5173/';
  const title = options?.examTitle || 'SkillBridge AI - Safe Exam Assessment';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>originatorVersion</key>
    <string>SEB_Win_3.4.1</string>
    <key>startURL</key>
    <string>${escapeXml(startUrl)}</string>
    <key>quitURL</key>
    <string>${escapeXml(quitUrl)}</string>
    <key>examTitle</key>
    <string>${escapeXml(title)}</string>
    
    <!-- Security & Lockdown Settings -->
    <key>allowQuit</key>
    <true/>
    <key>ignoreExitKeys</key>
    <true/>
    <key>allowPreferencesWindow</key>
    <false/>
    <key>showTaskBar</key>
    <false/>
    <key>showReloadButton</key>
    <false/>
    <key>showTime</key>
    <true/>
    <key>enableRightMouse</key>
    <false/>
    <key>allowSwitchTo3rdPartyApps</key>
    <false/>
    <key>browserWindowAllowReload</key>
    <false/>
    <key>allowFlashFullscreen</key>
    <true/>
    <key>blockScreenShotsAndRecording</key>
    <true/>
    <key>enableAltEsc</key>
    <false/>
    <key>enableAltF4</key>
    <false/>
    <key>enableAltTab</key>
    <false/>
    <key>enableCtrlEsc</key>
    <false/>
    <key>enableEsc</key>
    <false/>
    <key>enableF1</key>
    <false/>
    <key>enableF2</key>
    <false/>
    <key>enableF3</key>
    <false/>
    <key>enableF4</key>
    <false/>
    <key>enableF5</key>
    <false/>
    <key>enableF11</key>
    <false/>
    <key>enableF12</key>
    <false/>
    <key>enablePrintScreen</key>
    <false/>
    <key>enableStartMenu</key>
    <false/>
    <key>hookKeys</key>
    <true/>
    <key>monitorProcesses</key>
    <true/>
</dict>
</plist>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
