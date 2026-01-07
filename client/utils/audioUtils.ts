declare var lamejs: any;

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // PCM 16-bit is 2 bytes per sample
  const length = Math.floor(data.byteLength / 2);
  const frameCount = length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  // Use a DataView to read safely even if the buffer isn't perfectly aligned
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Read Int16 (2 bytes) and normalize to [-1.0, 1.0]
      const sampleIndex = (i * numChannels + channel) * 2;
      if (sampleIndex + 1 < data.byteLength) {
        channelData[i] = view.getInt16(sampleIndex, true) / 32768.0;
      }
    }
  }
  return buffer;
}

/**
 * Creates an MP3 blob from raw PCM data using lamejs.
 * Optimized for memory by avoiding large intermediate copies.
 */
export function createAudioBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  try {
    const channels = 1;
    const kbps = 128;
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    
    const length = Math.floor(pcmData.byteLength / 2);
    const view = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
    
    const mp3Data: Int8Array[] = [];
    const sampleBlockSize = 1152; 
    
    // Process in chunks to avoid allocating one giant Int16Array
    for (let i = 0; i < length; i += sampleBlockSize) {
      const remaining = length - i;
      const currentBlockSize = Math.min(sampleBlockSize, remaining);
      const samples = new Int16Array(currentBlockSize);
      
      for (let j = 0; j < currentBlockSize; j++) {
        samples[j] = view.getInt16((i + j) * 2, true);
      }
      
      const mp3buf = mp3encoder.encodeBuffer(samples);
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
      }
    }
    
    const lastBuf = mp3encoder.flush();
    if (lastBuf.length > 0) {
      mp3Data.push(new Int8Array(lastBuf));
    }
    
    return new Blob(mp3Data, { type: 'audio/mpeg' });
  } catch (err) {
    console.error("MP3 Encoding failed, falling back to WAV", err);
    return new Blob([pcmData], { type: 'audio/pcm' }); 
  }
}
