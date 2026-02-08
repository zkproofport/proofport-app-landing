import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ZKProofport - Zero-Knowledge Proof Infrastructure';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0f1e',
          color: '#00ff41',
          fontFamily: 'monospace',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 28, color: '#06b6d4', marginBottom: 20, display: 'flex' }}>
          visitor@zkproofport:~$
        </div>
        <div style={{ fontSize: 64, fontWeight: 'bold', marginBottom: 30, display: 'flex' }}>
          ZKProofport
        </div>
        <div style={{ fontSize: 24, color: '#94a3b8', marginBottom: 40, display: 'flex' }}>
          Zero-Knowledge Proof Infrastructure for Mobile
        </div>
        <div
          style={{
            display: 'flex',
            gap: '40px',
            fontSize: 18,
            color: '#7c3aed',
          }}
        >
          <span>Noir Circuits</span>
          <span style={{ color: '#475569' }}>|</span>
          <span>Mobile Proving</span>
          <span style={{ color: '#475569' }}>|</span>
          <span>On-Chain Verification</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
