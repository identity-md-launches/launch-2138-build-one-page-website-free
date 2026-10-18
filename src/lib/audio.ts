export type Sound = 'rain' | 'ocean' | 'brown'

// All audio is synthesized on this device, following a deliberate user gesture.
export class AmbientAudio {
  private context: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private gain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private volume = 0.35

  async prepare() {
    if (!window.AudioContext) throw new Error('Ambient sound is unavailable in this browser. You can still use the timer.')
    if (!this.context || this.context.state === 'closed') this.context = new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
    if (this.context.state !== 'running') throw new Error('Sound is paused by your browser. Select a sound to try again.')
    return this.context
  }

  async play(sound: Sound) {
    this.stop()
    const ctx = await this.prepare()
    const length = ctx.sampleRate * 8
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let brown = 0
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1
        brown = (brown + 0.02 * white) / 1.02
        data[i] = sound === 'brown' ? brown * 3.5 : white * 0.3
      }
      // A small crossfade makes the procedural texture's loop boundary gentle.
      const fade = Math.floor(ctx.sampleRate * 0.03)
      for (let i = 0; i < fade; i++) {
        data[i] *= i / fade
        data[length - i - 1] *= i / fade
      }
    }
    this.source = ctx.createBufferSource()
    this.source.buffer = buffer
    this.source.loop = true
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = sound === 'rain' ? 4000 : sound === 'ocean' ? 900 : 450
    this.gain = ctx.createGain()
    this.gain.gain.setValueAtTime(0, ctx.currentTime)
    this.gain.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 0.15)
    this.source.connect(this.filter).connect(this.gain).connect(ctx.destination)
    if (sound === 'ocean') {
      this.lfo = ctx.createOscillator()
      this.lfo.frequency.value = 0.1
      this.lfoGain = ctx.createGain()
      this.lfoGain.gain.value = this.volume * 0.65
      this.lfo.connect(this.lfoGain).connect(this.gain.gain)
      this.lfo.start()
    }
    this.source.start()
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value))
    if (this.context && this.gain) this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.04)
    if (this.context && this.lfoGain) this.lfoGain.gain.setTargetAtTime(this.volume * 0.65, this.context.currentTime, 0.04)
  }

  stop() {
    this.source?.stop()
    this.source?.disconnect()
    this.filter?.disconnect()
    this.gain?.disconnect()
    this.lfo?.stop()
    this.lfo?.disconnect()
    this.lfoGain?.disconnect()
    this.source = null
    this.filter = null
    this.gain = null
    this.lfo = null
    this.lfoGain = null
  }

  chime() {
    const ctx = this.context
    if (!ctx || ctx.state !== 'running') return
    for (const [frequency, delay] of [[523.25, 0], [659.25, 0.22], [783.99, 0.44]]) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + delay + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.2)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(ctx.currentTime + delay)
      oscillator.stop(ctx.currentTime + delay + 1.3)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    }
  }

  dispose() { this.stop(); void this.context?.close(); this.context = null }
}
