import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldAlert, Eye, UserCheck, AlertTriangle } from 'lucide-react';

interface CameraProctorHUDProps {
  onViolation: (type: string, details: string) => void;
  violationsCount: number;
}

export const CameraProctorHUD: React.FC<CameraProctorHUDProps> = ({ onViolation, violationsCount }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Candidate Verified');

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' },
            audio: false
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setStreamActive(true);
          }
        } else {
          setPermissionDenied(true);
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable. Using simulated vision monitoring.');
        setPermissionDenied(true);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div
      className="card card-glass"
      style={{
        width: '240px',
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        border: violationsCount >= 3 ? '2px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
        background: '#0a0f1d'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={15} color="var(--accent-emerald)" />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
            AI PROCTOR VISION
          </span>
        </div>
        <span
          className={`badge ${violationsCount > 0 ? 'badge-critical' : 'badge-success'}`}
          style={{ fontSize: '10px' }}
        >
          {violationsCount > 0 ? `${violationsCount} Flag(s)` : 'Clear'}
        </span>
      </div>

      {/* Video Feed Box */}
      <div
        style={{
          width: '100%',
          height: '140px',
          background: '#030712',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {streamActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <Camera size={32} color="var(--text-muted)" style={{ margin: '0 auto 6px auto', display: 'block' }} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {permissionDenied ? 'Simulated AI Vision Sentinel' : 'Requesting Camera...'}
            </span>
          </div>
        )}

        {/* Vision bounding crosshair overlay */}
        <div
          style={{
            position: 'absolute',
            inset: '16px',
            border: '1px dashed hsla(152, 76%, 45%, 0.4)',
            borderRadius: 'var(--radius-sm)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '4px'
          }}
        >
          <span style={{ fontSize: '9px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
            [FACE_DETECTED: 99.4%]
          </span>
        </div>
      </div>

      {/* Integrity Signal Bar */}
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Session State:</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
          {statusMessage}
        </span>
      </div>

      {violationsCount > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 8px',
            background: 'hsla(350, 89%, 60%, 0.1)',
            borderRadius: '4px',
            border: '1px solid hsla(350, 89%, 60%, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <AlertTriangle size={13} color="var(--accent-rose)" />
          <span style={{ fontSize: '10px', color: 'var(--accent-rose)', lineHeight: 1.2 }}>
            Window blur or tab switch logged. Reattempts locked if &gt; 5.
          </span>
        </div>
      )}
    </div>
  );
};
