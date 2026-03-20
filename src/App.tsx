import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Play, Pause, Square, Shuffle, Download, 
  Headphones, Music, Activity, ChevronUp, ChevronDown, Radio
} from 'lucide-react';

// --- MUSICAL ENGINE (DYNAMIC KEYS) ---

const ROOT_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

interface KeyDef {
  root: string;
  type: 'Major' | 'Minor';
  rootIdx: number;
}

const ALL_KEYS: KeyDef[] = [];
ROOT_NOTES.forEach((root, i) => {
  ALL_KEYS.push({ root, type: 'Major', rootIdx: i });
  ALL_KEYS.push({ root, type: 'Minor', rootIdx: i });
});

const SCALES: Record<'Major' | 'Minor', number[]> = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10]
};

const CHORD_QUALITIES: Record<'Major' | 'Minor', string[]> = {
  'Major': ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  'Minor': ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj']
};

const CHORD_OFFSETS: Record<string, number[]> = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
};

const PROGRESSIONS = [
  { name: "Pop Anthem", degrees: [1, 5, 6, 4] },
  { name: "Moody", degrees: [6, 4, 1, 5] },
  { name: "Smooth", degrees: [4, 3, 2, 1] },
  { name: "Classic 50s", degrees: [1, 6, 4, 5] },
  { name: "Uplifting", degrees: [4, 1, 5, 6] },
  { name: "Jazz Turnaround", degrees: [2, 5, 1, 6] },
  { name: "Neo-Soul", degrees: [4, 5, 3, 6] },
  { name: "Sad Boy", degrees: [4, 1, 2, 6] },
  { name: "Descent", degrees: [1, 7, 6, 5] },
  { name: "Ascent", degrees: [1, 2, 3, 4] },
  { name: "Vamp", degrees: [1, 4, 1, 4] },
  { name: "Club Loop", degrees: [2, 4, 6, 5] }
];

const STYLES = [
  {
    name: "Pop", tempoRange: [100, 130],
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bass:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    keys:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "Hip Hop", tempoRange: [80, 100],
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bass:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    keys:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "House", tempoRange: [120, 130],
    kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    keys:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
  },
  {
    name: "R&B", tempoRange: [70, 90],
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    bass:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    keys:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "Rock", tempoRange: [110, 140],
    kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bass:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    keys:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  },
  {
    name: "Lo-Fi", tempoRange: [70, 90],
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bass:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    keys:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "Reggaeton", tempoRange: [90, 110],
    kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bass:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    keys:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0]
  },
  {
    name: "Synthwave", tempoRange: [110, 130],
    kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    keys:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
  },
  {
    name: "Trap", tempoRange: [130, 160],
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bass:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    keys:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "Funk", tempoRange: [95, 115],
    kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    bass:  [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    keys:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0]
  },
  {
    name: "Drum & Bass", tempoRange: [160, 180],
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    bass:  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    keys:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "Bossa Nova", tempoRange: [120, 140],
    kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snare: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bass:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    keys:  [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]
  }
];

// Theory helper functions
const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const getChordDetails = (keyIdx: number, degree: number) => {
  const key = ALL_KEYS[keyIdx];
  const scale = SCALES[key.type];
  const quality = CHORD_QUALITIES[key.type][degree - 1];
  
  const chordRootIdx = (key.rootIdx + scale[degree - 1]) % 12;
  const rootName = ROOT_NOTES[chordRootIdx];
  
  let suffix = '';
  if (quality === 'min') suffix = 'm';
  if (quality === 'dim') suffix = 'dim';
  
  const chordName = rootName + suffix;

  const bassMidi = 36 + chordRootIdx; 
  const keysMidi = 60 + chordRootIdx; 
  const freqs = CHORD_OFFSETS[quality].map(offset => midiToFreq(keysMidi + offset));
  
  return { name: chordName, bassFreq: midiToFreq(bassMidi), freqs };
};

// --- AUDIO ENGINE CORE ---

let audioCtx: AudioContext | any = null;
let masterGain: GainNode | any = null;
let backingDest: MediaStreamAudioDestinationNode | any = null;
let mixDest: MediaStreamAudioDestinationNode | any = null;
let micSourceNode: MediaStreamAudioSourceNode | any = null;
let noiseBuffer: AudioBuffer | any = null;
let mixLimiterNode: DynamicsCompressorNode | any = null;

const initAudio = async () => {
  if (audioCtx) return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioCtx = new AudioContextClass();
  
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.7; // Reduce overall gain for headroom
  
  // Master Limiter to prevent instrumental clipping
  const masterLimiter = audioCtx.createDynamicsCompressor();
  masterLimiter.threshold.value = -3.0;
  masterLimiter.knee.value = 0.0;
  masterLimiter.ratio.value = 20.0;
  masterLimiter.attack.value = 0.002;
  masterLimiter.release.value = 0.1;
  
  masterGain.connect(masterLimiter);
  masterLimiter.connect(audioCtx.destination); 
  
  backingDest = audioCtx.createMediaStreamDestination();
  masterLimiter.connect(backingDest);

  mixDest = audioCtx.createMediaStreamDestination();
  
  // Mix Limiter to prevent clipping when summing mic and instrumental
  mixLimiterNode = audioCtx.createDynamicsCompressor();
  mixLimiterNode.threshold.value = -1.0;
  mixLimiterNode.knee.value = 0.0;
  mixLimiterNode.ratio.value = 20.0;
  mixLimiterNode.attack.value = 0.002;
  mixLimiterNode.release.value = 0.1;
  
  masterLimiter.connect(mixLimiterNode);
  mixLimiterNode.connect(mixDest);

  const bufferSize = audioCtx.sampleRate * 2; 
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
};

const getSupportedMimeType = () => {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (let t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
};

// --- AUDIO CONVERSION TO WAV ---

const audioBufferToWav = (buffer: AudioBuffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const result = new Float32Array(buffer.length * numChannels);
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < buffer.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result.set(buffer.getChannelData(0));
  }

  const dataLength = result.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
};

const convertToWav = async (blob: Blob, ctx: AudioContext) => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    return audioBufferToWav(audioBuffer);
  } catch (err) {
    console.error("Failed to convert to WAV:", err);
    return blob;
  }
};

// --- UI COMPONENTS ---

interface DraggableCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  onDelta: (delta: number) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ label, value, subValue, onDelta }) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    lastY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = lastY.current - e.clientY; 
    
    if (Math.abs(deltaY) > 15) {
      onDelta(Math.sign(deltaY));
      lastY.current = e.clientY;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 backdrop-blur flex flex-col items-center justify-center relative touch-none select-none transition-colors group h-24 ${
        isDragging ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)] cursor-ns-resize' : 'cursor-ns-resize hover:border-slate-600'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <ChevronUp className="w-4 h-4 text-slate-500 opacity-30 group-hover:opacity-100 absolute top-2 transition-opacity" />
      <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 mt-3 font-medium">{label}</span>
      <span className="text-lg font-semibold text-center leading-tight truncate w-full px-2">{value}</span>
      {subValue && <span className="text-xs text-indigo-400 mt-1 truncate w-full text-center">{subValue}</span>}
      <ChevronDown className="w-4 h-4 text-slate-500 opacity-30 group-hover:opacity-100 absolute bottom-2 transition-opacity" />
    </div>
  );
};


// --- MAIN APPLICATION COMPONENT ---

export default function App() {
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [transportState, setTransportState] = useState('stopped'); 
  const [recordingState, setRecordingState] = useState('idle'); 

  const [tempo, setTempo] = useState(110);
  const [styleIdx, setStyleIdx] = useState(0);
  const [progIdx, setProgIdx] = useState(0);
  const [keyIdx, setKeyIdx] = useState(0); 
  
  const [vocalUrl, setVocalUrl] = useState<string | null>(null);
  const [backingUrl, setBackingUrl] = useState<string | null>(null);
  const [mixUrl, setMixUrl] = useState<string | null>(null);
  
  const [currentBeat, setCurrentBeat] = useState(0);
  const [activeChordName, setActiveChordName] = useState('...');
  
  const currentBeatRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<any>(null);
  const barCountRef = useRef(0);
  
  const vocalRecorderRef = useRef<any>(null);
  const backingRecorderRef = useRef<any>(null);
  const mixRecorderRef = useRef<any>(null);
  
  const vocalChunksRef = useRef<Blob[]>([]);
  const backingChunksRef = useRef<Blob[]>([]);
  const mixChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);

  const currentStyle = STYLES[styleIdx];
  const currentProgression = PROGRESSIONS[progIdx];
  const currentKey = ALL_KEYS[keyIdx];

  useEffect(() => {
    if (document.getElementById('tailwind-cdn')) {
      setStylesLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'tailwind-cdn';
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => setStylesLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handleTempoChange = (delta: number) => {
    setTempo(t => Math.max(60, Math.min(180, t + delta)));
  };
  const handleStyleChange = (delta: number) => {
    setStyleIdx(idx => (idx + delta + STYLES.length) % STYLES.length);
  };
  const handleProgChange = (delta: number) => {
    setProgIdx(idx => (idx + delta + PROGRESSIONS.length) % PROGRESSIONS.length);
  };
  const handleKeyChange = (delta: number) => {
    setKeyIdx(idx => (idx + delta + ALL_KEYS.length) % ALL_KEYS.length);
  };

  const scheduleNote = useCallback((beatNumber: number, time: number) => {
    const style = STYLES[styleIdx];
    const progression = PROGRESSIONS[progIdx];
    const stepDuration = (60.0 / tempo) * 0.25;

    const degree = progression.degrees[barCountRef.current % progression.degrees.length];
    const chordDetails = getChordDetails(keyIdx, degree);

    if (beatNumber % 4 === 0) {
      requestAnimationFrame(() => {
        setCurrentBeat(beatNumber / 4);
        setActiveChordName(chordDetails.name);
      });
    }

    if (style.kick[beatNumber]) playKick(time);
    if (style.snare[beatNumber]) playSnare(time);
    if (style.hat[beatNumber]) playHat(time);
    if (style.bass[beatNumber]) playBass(chordDetails.bassFreq, time, stepDuration * 0.9);
    if (style.keys[beatNumber]) playKeys(chordDetails.freqs, time, stepDuration * 3.5);
  }, [styleIdx, progIdx, keyIdx, tempo]);

  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTimeRef.current += 0.25 * secondsPerBeat;
    currentBeatRef.current++;
    
    if (currentBeatRef.current === 16) {
      currentBeatRef.current = 0;
      barCountRef.current++;
    }
  }, [tempo]);

  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
      scheduleNote(currentBeatRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = setTimeout(scheduler, 25.0);
  }, [scheduleNote, nextNote]);

  const startPlayback = async () => {
    if (!audioCtx) await initAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    if (transportState === 'stopped') {
      const degree = PROGRESSIONS[progIdx].degrees[0];
      const chordDetails = getChordDetails(keyIdx, degree);
      setActiveChordName(chordDetails.name);
      currentBeatRef.current = 0;
      barCountRef.current = 0;
    }
    
    nextNoteTimeRef.current = audioCtx.currentTime + 0.1;
    scheduler();
    setTransportState('playing');
  };

  const handleStop = () => {
    clearTimeout(timerIDRef.current);
    setTransportState('stopped');
    setCurrentBeat(0);
    barCountRef.current = 0;
    currentBeatRef.current = 0;
    setActiveChordName('...');

    if (recordingState !== 'idle') {
      if (vocalRecorderRef.current?.state !== "inactive") vocalRecorderRef.current.stop();
      if (backingRecorderRef.current?.state !== "inactive") backingRecorderRef.current.stop();
      if (mixRecorderRef.current?.state !== "inactive") mixRecorderRef.current.stop();
      setRecordingState('idle');
    }
  };

  const handlePlayPause = async () => {
    if (transportState === 'playing') {
      clearTimeout(timerIDRef.current);
      setTransportState('paused');
      
      if (recordingState === 'recording') {
        if (vocalRecorderRef.current?.state === 'recording') vocalRecorderRef.current.pause();
        if (backingRecorderRef.current?.state === 'recording') backingRecorderRef.current.pause();
        if (mixRecorderRef.current?.state === 'recording') mixRecorderRef.current.pause();
        setRecordingState('paused');
      }
    } else {
      await startPlayback();
    }
  };

  const startNewRecordingSession = async () => {
    try {
      if (!audioCtx) await initAudio();
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      setVocalUrl(null); setBackingUrl(null); setMixUrl(null);

      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false, 
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        
        micSourceNode = audioCtx.createMediaStreamSource(micStreamRef.current);
        micSourceNode.connect(mixLimiterNode);

        vocalChunksRef.current = [];
        const vocalRecorder = new MediaRecorder(micStreamRef.current, options);
        vocalRecorder.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) vocalChunksRef.current.push(e.data); };
        vocalRecorder.onstop = async () => {
          const blob = new Blob(vocalChunksRef.current, { type: mimeType || 'audio/webm' });
          if (blob.size > 0) {
            const wavBlob = await convertToWav(blob, audioCtx);
            setVocalUrl(URL.createObjectURL(wavBlob));
          }
          if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
          if (micSourceNode) micSourceNode.disconnect();
        };
        vocalRecorderRef.current = vocalRecorder;
        vocalRecorder.start(200);

      } catch (micErr) {
        console.warn("Mic access denied or unavailable. Recording instrumental only.");
      }

      backingChunksRef.current = [];
      const backingRecorder = new MediaRecorder(backingDest.stream, options);
      backingRecorder.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) backingChunksRef.current.push(e.data); };
      backingRecorder.onstop = async () => {
         const blob = new Blob(backingChunksRef.current, { type: mimeType || 'audio/webm' });
         if (blob.size > 0) {
           const wavBlob = await convertToWav(blob, audioCtx);
           setBackingUrl(URL.createObjectURL(wavBlob));
         }
      };
      backingRecorderRef.current = backingRecorder;
      backingRecorder.start(200);

      mixChunksRef.current = [];
      const mixRecorder = new MediaRecorder(mixDest.stream, options);
      mixRecorder.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) mixChunksRef.current.push(e.data); };
      mixRecorder.onstop = async () => {
         const blob = new Blob(mixChunksRef.current, { type: mimeType || 'audio/webm' });
         if (blob.size > 0) {
           const wavBlob = await convertToWav(blob, audioCtx);
           setMixUrl(URL.createObjectURL(wavBlob));
         }
      };
      mixRecorderRef.current = mixRecorder;
      mixRecorder.start(200);

      setRecordingState('recording');
      if (transportState !== 'playing') await startPlayback();

    } catch (err) {
      alert("Failed to initialize recording context. Make sure you are using a modern browser.");
      console.error(err);
    }
  };

  const handleRecordClick = async () => {
    if (recordingState === 'idle') {
      await startNewRecordingSession();
    } else if (recordingState === 'recording') {
      if (vocalRecorderRef.current?.state === 'recording') vocalRecorderRef.current.pause();
      if (backingRecorderRef.current?.state === 'recording') backingRecorderRef.current.pause();
      if (mixRecorderRef.current?.state === 'recording') mixRecorderRef.current.pause();
      setRecordingState('paused');
    } else if (recordingState === 'paused') {
      if (vocalRecorderRef.current?.state === 'paused') vocalRecorderRef.current.resume();
      if (backingRecorderRef.current?.state === 'paused') backingRecorderRef.current.resume();
      if (mixRecorderRef.current?.state === 'paused') mixRecorderRef.current.resume();
      setRecordingState('recording');
      if (transportState !== 'playing') await startPlayback();
    }
  };

  const randomizeIdea = () => {
    const newStyleIdx = Math.floor(Math.random() * STYLES.length);
    const newStyle = STYLES[newStyleIdx];
    
    setStyleIdx(newStyleIdx);
    setProgIdx(Math.floor(Math.random() * PROGRESSIONS.length));
    setKeyIdx(Math.floor(Math.random() * ALL_KEYS.length));
    
    const minTempo = newStyle.tempoRange[0];
    const maxTempo = newStyle.tempoRange[1];
    setTempo(Math.floor(Math.random() * (maxTempo - minTempo + 1)) + minTempo);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timerIDRef.current);
      if (audioCtx) audioCtx.close();
      if (vocalUrl) URL.revokeObjectURL(vocalUrl);
      if (backingUrl) URL.revokeObjectURL(backingUrl);
      if (mixUrl) URL.revokeObjectURL(mixUrl);
    };
  }, [vocalUrl, backingUrl, mixUrl]);

  if (!stylesLoaded) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#818cf8', fontFamily: 'sans-serif' }}>
        <p>Loading SongSketch Interface...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-rose-400 bg-clip-text text-transparent">
            SongSketch
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6 pb-24">
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-start gap-3 text-sm text-blue-300">
          <Headphones className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>For the best quality, use headphones while recording vocals.</p>
        </div>

        {/* Visualizer */}
        <div className="relative flex flex-col items-center justify-center py-6">
          <div className={`w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
            recordingState === 'recording' ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)] scale-105' : 
            recordingState === 'paused' ? 'border-rose-900 shadow-[0_0_20px_rgba(244,63,94,0.15)]' :
            transportState === 'playing' ? 'border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)] scale-105' : 
            'border-slate-700'
          }`}>
            
            {transportState === 'playing' && (
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse rounded-full pointer-events-none" />
            )}

            <span className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold opacity-60">
              {recordingState === 'recording' ? 'RECORDING' : 
               recordingState === 'paused' ? 'REC PAUSED' : 
               transportState === 'playing' ? 'PLAYING' : 
               transportState === 'paused' ? 'PAUSED' : 'READY'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {activeChordName}
              </span>
            </div>
            
            <div className="flex gap-2 mt-4">
              {[0, 1, 2, 3].map(beat => (
                <div 
                  key={beat} 
                  className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    transportState === 'playing' && currentBeat === beat 
                      ? (recordingState === 'recording' ? 'bg-rose-500 scale-125' : 'bg-indigo-500 scale-125') 
                      : 'bg-slate-700 scale-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Draggable Parameter Grid */}
        <div className="grid grid-cols-2 gap-3 relative">
          <DraggableCard 
            label="Song Style" 
            value={currentStyle.name} 
            onDelta={handleStyleChange} 
          />
          <DraggableCard 
            label="Tempo" 
            value={`${tempo} BPM`} 
            onDelta={handleTempoChange} 
          />
          <DraggableCard 
            label="Musical Key" 
            value={`${currentKey.root} ${currentKey.type}`} 
            onDelta={handleKeyChange} 
          />
          <DraggableCard 
            label="Progression" 
            value={currentProgression.name} 
            subValue={currentProgression.degrees.join(' - ')}
            onDelta={handleProgChange} 
          />
        </div>

        {/* Main Controls */}
        <div className="flex justify-center items-center gap-5 py-6">
          
          <button 
            onClick={randomizeIdea}
            className="p-4 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95 shadow-lg border border-slate-700/50"
            title="Randomize All"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <div className="relative flex items-center justify-center">
            <button 
              onClick={handleStop}
              disabled={transportState === 'stopped' && recordingState === 'idle'}
              className={`p-4 rounded-full transition-all active:scale-95 shadow-lg ${
                transportState === 'stopped' && recordingState === 'idle'
                  ? 'bg-slate-800/30 text-slate-700 cursor-not-allowed border border-transparent'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <button 
              onClick={handleRecordClick}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                recordingState === 'recording' 
                  ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)]' 
                  : recordingState === 'paused'
                  ? 'bg-rose-900 text-rose-300 border-2 border-rose-500'
                  : 'bg-slate-800 text-rose-500 border-2 border-slate-700 hover:border-rose-500/50'
              }`}
            >
               <Mic className={`w-9 h-9 ${recordingState === 'recording' ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <button 
              onClick={handlePlayPause}
              className={`p-5 rounded-full transition-all active:scale-95 shadow-lg ${
                transportState === 'playing'
                  ? 'bg-indigo-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.4)]' 
                  : 'bg-slate-800 text-indigo-400 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
               {transportState === 'playing' ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
            </button>
          </div>

        </div>

        {/* Export / Recorded Tracks Area */}
        {(vocalUrl || backingUrl || mixUrl) && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-800 pb-3 text-indigo-300 uppercase tracking-widest">
              <Download className="w-4 h-4" /> 
              Your Saved Ideas
            </h3>
            
            {mixUrl && (
              <div className="bg-emerald-900/20 rounded-2xl p-5 flex flex-col gap-3 shadow-lg border border-emerald-500/20">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Radio className="w-4 h-4" /> The Song (Full Mix)
                  </span>
                  <a 
                    href={mixUrl} 
                    download={`songsketch_mix.wav`}
                    className="text-[10px] font-black bg-emerald-500 text-white px-4 py-2 rounded-full hover:bg-emerald-400 transition-colors shadow-lg uppercase tracking-tighter"
                  >
                    Download WAV
                  </a>
                </div>
                <audio key={mixUrl} src={mixUrl} controls className="w-full h-10 rounded-lg outline-none" />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {vocalUrl && (
                <div className="bg-slate-800/60 rounded-2xl p-4 flex flex-col gap-3 border border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-300 flex items-center gap-2 text-xs uppercase tracking-wide">
                      <Mic className="w-4 h-4" /> Vocals Only
                    </span>
                    <a 
                      href={vocalUrl} 
                      download={`songsketch_vocals.wav`}
                      className="text-[10px] font-bold bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors uppercase"
                    >
                      Save
                    </a>
                  </div>
                  <audio key={vocalUrl} src={vocalUrl} controls className="w-full h-10 rounded-lg outline-none" />
                </div>
              )}

              {backingUrl && (
                <div className="bg-slate-800/60 rounded-2xl p-4 flex flex-col gap-3 border border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-300 flex items-center gap-2 text-xs uppercase tracking-wide">
                      <Activity className="w-4 h-4" /> Instrumental
                    </span>
                    <a 
                      href={backingUrl} 
                      download={`songsketch_instrumental.wav`}
                      className="text-[10px] font-bold bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors uppercase"
                    >
                      Save
                    </a>
                  </div>
                  <audio key={backingUrl} src={backingUrl} controls className="w-full h-10 rounded-lg outline-none" />
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
