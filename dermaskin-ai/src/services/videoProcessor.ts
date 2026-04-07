/**
 * Client-side video processing: frame extraction and audio extraction.
 */

export interface ExtractedFrame {
  time: number;      // seconds
  dataUrl: string;   // base64 JPEG
  width: number;
  height: number;
}

/**
 * Extract key frames from a video file at regular intervals.
 */
export async function extractFrames(
  file: File,
  intervalSec: number,
  maxFrames: number,
  onProgress?: (pct: number, msg: string) => void,
): Promise<{ frames: ExtractedFrame[]; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('无法加载视频文件'));
    video.src = url;
  });

  const duration = video.duration;
  const totalFrames = Math.min(maxFrames, Math.ceil(duration / intervalSec));
  const actualInterval = duration / totalFrames;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const targetWidth = 768;
  const scale = targetWidth / video.videoWidth;
  canvas.width = targetWidth;
  canvas.height = Math.round(video.videoHeight * scale);

  const frames: ExtractedFrame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const time = Math.min(i * actualInterval, duration - 0.1);
    onProgress?.(
      Math.round((i / totalFrames) * 100),
      `提取帧 ${i + 1}/${totalFrames} (${formatTime(time)})`,
    );

    video.currentTime = time;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    frames.push({ time, dataUrl, width: canvas.width, height: canvas.height });
  }

  URL.revokeObjectURL(url);
  return { frames, duration };
}

/**
 * Extract audio from a video file as a WAV blob for speech-to-text.
 */
export async function extractAudio(
  file: File,
  onProgress?: (pct: number, msg: string) => void,
): Promise<Blob> {
  onProgress?.(0, '解码音频数据...');

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  onProgress?.(50, '转换音频格式...');

  const channelData = audioBuffer.getChannelData(0);
  const wavBlob = encodeWAV(channelData, 16000);

  onProgress?.(100, '音频提取完成');
  audioCtx.close();
  return wavBlob;
}

/**
 * Encode PCM float data to WAV format.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const length = samples.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Get video duration without full loading.
 */
export async function getVideoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      const dur = video.duration;
      URL.revokeObjectURL(url);
      resolve(dur);
    };
    video.onerror = () => reject(new Error('无法读取视频'));
    video.src = url;
  });
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
