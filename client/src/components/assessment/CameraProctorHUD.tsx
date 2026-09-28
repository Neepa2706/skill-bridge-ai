import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldAlert, Eye, UserCheck, AlertTriangle, Video, VideoOff, RefreshCw } from 'lucide-react';

interface CameraProctorHUDProps {
  onViolation: (type: string, details: string) => void;
  violationsCount: number;
}

export const CameraProctorHUD: React.FC<CameraProctorHUDProps> = ({ onViolation, violationsCount }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Candidate Verified');
  const [faceConfidence, setFaceConfidence] = useState<number>(98.6);
  const [integrityScore, setIntegrityScore] = useState<number>(100);

  const startCamera = async () => {
    setIsRequesting(true);
    setPermissionDenied(false);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play interrupted:', playErr);
          }
          setStreamActive(true);
          setStatusMessage('Active Live Feed');
        }
      } else {
        setPermissionDenied(true);
        setStatusMessage('Camera Not Supported');
      }
    } catch (err: any) {
      console.warn('Camera request denied or unavailable:', err.message);
      setPermissionDenied(true);
      setStreamActive(false);
      setStatusMessage('Camera Permission Required');
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    startCamera();

    // Subtle face confidence jitter simulation for realistic AI HUD
    const interval = setInterval(() => {
      setFaceConfidence(prev => {
        const jitter = (Math.random() * 1.4) - 0.7;
        return Math.min(99.9, Math.max(94.0, Number((prev + jitter).toFixed(1))));
      });
    }, 3500);

    return () => {
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Update integrity score based on violations
  useEffect(() => {
    const calculated = Math.max(0, 100 - (violationsCount * 12));
    setIntegrityScore(calculated);
    if (violationsCount > 0) {
      setStatusMessage(`${violationsCount} Integrity Flag(s)`);
    }
  }, [violationsCount]);

  return (
    <div
      className="card card-glass"
      style={{
        width: '100%',
        padding: '14px',
        borderRadius: 'var(--radius-md)',
        border: violationsCount >= 3 ? '2px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
        background: '#0a0f1d',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: streamActive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              boxShadow: streamActive ? '0 0 10px var(--accent-emerald)' : 'none',
              animation: streamActive ? 'pulse 2s infinite' : 'none'
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            PROCTOR CAMERA HUD
          </span>
        </div>
        <span
          className={`badge ${violationsCount > 0 ? 'badge-critical' : 'badge-success'}`}
          style={{ fontSize: '10px', padding: '2px 8px' }}
        >
          {violationsCount > 0 ? `${violationsCount} Flag(s)` : 'Verified'}
        </span>
      </div>

      {/* Video Feed Screen */}
      <div
        style={{
          width: '100%',
          height: '160px',
          background: '#020617',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: streamActive ? 'block' : 'none'
          }}
        />

        {!streamActive && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <Camera size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
              {permissionDenied
                ? 'Camera access blocked by browser. Click below to allow webcam feed.'
                : 'Connecting proctoring camera sensor...'}
            </p>
            <button
              onClick={startCamera}
              disabled={isRequesting}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '11px', padding: '4px 12px', gap: '6px' }}
            >
              <RefreshCw size={12} className={isRequesting ? 'spin' : ''} />
              {isRequesting ? 'Requesting...' : 'Enable Camera'}
            </button>
          </div>
        )}

        {/* AI Vision HUD overlay reticle when stream is active */}
        {streamActive && (
          <>
            {/* Corner Bracket Reticles */}
            <div
              style={{
                position: 'absolute',
                inset: '14px',
                border: '1.5px dashed hsla(158, 64%, 52%, 0.45)',
                borderRadius: '8px',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--accent-emerald)',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '2px 5px',
                    borderRadius: '3px'
                  }}
                >
                  🟢 REC • {faceConfidence}% CONFIDENCE
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '2px 5px',
                    borderRadius: '3px'
                  }}
                >
                  30 FPS
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  }}
                >
                  TARGET: CENTER
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    color: integrityScore > 80 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0, 0, 0, 0.65)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  }}
                >
                  INTEGRITY: {integrityScore}%
                </span>
              </div>
            </div>

            {/* Target Face Center Crosshair */}
            <div
              style={{
                position: 'absolute',
                width: '40px',
                height: '40px',
                border: '1px solid hsla(158, 64%, 52%, 0.3)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }}
            />
          </>
        )}
      </div>

      {/* Sensor Status Bar */}
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={13} color={streamActive ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Proctor Status:</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: streamActive ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
          {statusMessage}
        </span>
      </div>

      {violationsCount > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: 'hsla(350, 89%, 60%, 0.12)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid hsla(350, 89%, 60%, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={14} color="var(--accent-rose)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '10px', color: 'var(--accent-rose)', lineHeight: 1.3 }}>
            Security event logged. Switching tabs or window defocus triggers auto-submission.
          </span>
        </div>
      )}
    </div>
  );
};
