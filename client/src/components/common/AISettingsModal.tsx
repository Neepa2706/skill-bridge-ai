import React, { useState, useEffect } from 'react';
import { Sparkles, Key, CheckCircle2, AlertCircle, X, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, onConfigured }) => {
  const { addToast } = useNotification();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e: any) {
      console.warn('Could not fetch AI status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setErrorMessage('Please enter a valid Gemini API key.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addToast('AI Configured', 'Google Gemini API key verified and activated!', 'success');
        setApiKey('');
        fetchStatus();
        if (onConfigured) onConfigured();
        setTimeout(() => onClose(), 1000);
      } else {
        setErrorMessage(data.error || 'Failed to verify Gemini API key.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error verifying API key.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '28px',
          border: '1px solid var(--border-bright)',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'hsla(265, 89%, 66%, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Google Gemini AI Settings</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time generative assessment & evaluation engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Indicator */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            background: status?.configured ? 'hsla(152, 76%, 45%, 0.1)' : 'hsla(38, 92%, 50%, 0.1)',
            border: `1px solid ${status?.configured ? 'hsla(152, 76%, 45%, 0.3)' : 'hsla(38, 92%, 50%, 0.3)'}`,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {status?.configured ? (
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
            ) : (
              <AlertCircle size={18} color="var(--accent-amber)" />
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: status?.configured ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {status?.configured ? 'Gemini AI Active (Connected)' : 'GEMINI_API_KEY Not Configured'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Model: <code>gemini-1.5-flash</code> {status?.keyPreview ? `(${status.keyPreview})` : ''}
              </div>
            </div>
          </div>
          <span className={`badge ${status?.configured ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
            {status?.configured ? 'Ready' : 'Setup Required'}
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveKey}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Gemini API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status?.configured ? 'Paste new API key to update...' : 'AIzaSy...'}
                className="input"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px'
                }}
              />
              <Key
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Get a free API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                Google AI Studio <ExternalLink size={10} />
              </a>
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'hsla(350, 89%, 60%, 0.1)',
                border: '1px solid hsla(350, 89%, 60%, 0.3)',
                color: 'var(--accent-rose)',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !apiKey.trim()}
              className="btn btn-primary"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={16} className="spin" /> Verifying Connection...
                </>
              ) : (
                'Save & Verify API Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
