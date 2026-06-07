/**
 * Play a notification "ding" sound using the Web Audio API.
 * No external audio file needed — generates a pleasant tone programmatically.
 * 
 * Uses a two-tone chime (800Hz → 1000Hz) for a recognizable notification sound.
 * Safe to call in any context — silently no-ops if AudioContext is unavailable.
 */
export function playNotificationSound() {
    try {
        const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext

        if (!AudioContextClass) return

        const ctx = new AudioContextClass()

        // First tone — 800Hz
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.frequency.value = 800
        osc1.type = 'sine'
        gain1.gain.setValueAtTime(0.3, ctx.currentTime)
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc1.start(ctx.currentTime)
        osc1.stop(ctx.currentTime + 0.4)

        // Second tone — 1000Hz (slightly delayed for chime effect)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1000
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc2.start(ctx.currentTime + 0.15)
        osc2.stop(ctx.currentTime + 0.6)

        // Cleanup context after sounds finish
        setTimeout(() => ctx.close(), 1000)
    } catch {
        // Silently fail — audio is a nice-to-have, not critical
    }
}
