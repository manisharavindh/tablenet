export const SOUND_PROFILES = [
  { id: 'classic', name: 'Classic Beep' },
  { id: 'chime', name: 'Soft Chime' },
  { id: 'alert', name: 'Alert Bell' },
  { id: 'digital', name: 'Digital Notification' }
];

export const playNotificationSound = (profileId = 'classic') => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    switch (profileId) {
      case 'chime':
        // A pleasant two-tone chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.6);
        break;

      case 'alert':
        // A sharp, attention-grabbing ring (square wave)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.4);
        
        // Second ring
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'square';
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.15);
        gain2.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.17);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.55);
        osc2.start(audioCtx.currentTime + 0.15);
        osc2.stop(audioCtx.currentTime + 0.55);
        break;

      case 'digital':
        // A modern digital triple-beep
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
        oscillator.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
        oscillator.frequency.setValueAtTime(1567.98, audioCtx.currentTime + 0.2); // G6
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.4);
        break;

      case 'classic':
      default:
        // Original Classic Beep
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); // Drop to A4
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
        break;
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
