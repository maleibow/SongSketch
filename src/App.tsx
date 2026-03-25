// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Play, Pause, Square, Shuffle, Download, 
  Headphones, Music, Activity, ChevronUp, ChevronDown, Radio, HelpCircle,
  Settings, Sliders, Bell, Layers, Speaker, Drum
} from 'lucide-react';

// --- TYPES & INTERFACES ---

interface KeyDef {
  root: string;
  type: 'Major' | 'Minor';
  rootIdx: number;
}

interface StyleDef {
  name: string;
  tempoRange: [number, number];
  kick: number[];
  snare: number[];
  hat: number[];
  bass: number[];
  keys: number[];
  pad?: number[];
  guitar?: number[];
}

interface ProgressionDef {
  name: string;
  degrees: number[];
}

// --- MUSICAL ENGINE DATA ---

const ROOT_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

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

const PROGRESSIONS: ProgressionDef[] = [
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
  { name: "Club Loop", degrees: [2, 4, 6, 5] },
  { name: "Pop 8-Bar Epic", degrees: [1, 5, 6, 4, 1, 5, 4, 4] },
  { name: "Jazz Journey", degrees: [2, 5, 1, 6, 2, 5, 1, 1] },
  { name: "Storyteller", degrees: [1, 6, 4, 5, 6, 3, 4, 5] },
  { name: "Dark Chain", degrees: [6, 4, 1, 5, 6, 4, 3, 3] },
  { name: "Wandering 8-Bar", degrees: [4, 1, 5, 6, 4, 1, 2, 5] }
];

const ZEROS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const STYLES: StyleDef[] = [
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
  },
  // DRUM-LESS STYLES
  {
    name: "Piano Only", tempoRange: [60, 90],
    kick: ZEROS, snare: ZEROS, hat: ZEROS, bass: ZEROS,
    keys: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  },
  {
    name: "Piano & Violin", tempoRange: [60, 85],
    kick: ZEROS, snare: ZEROS, hat: ZEROS, bass: ZEROS,
    keys: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    pad:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    name: "Acoustic Guitar", tempoRange: [70, 100],
    kick: ZEROS, snare: ZEROS, hat: ZEROS, bass: ZEROS, keys: ZEROS,
    guitar: [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
  },
  {
    name: "Piano & Bass", tempoRange: [80, 110],
    kick: ZEROS, snare: ZEROS, hat: ZEROS,
    bass: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    keys: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]
  }
];

// --- THEORY HELPER FUNCTIONS ---

const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const getChordDetails = (keyIdx, degree) => {
  const key = ALL_KEYS[keyIdx];
  const scale = SCALES[key.type];
  const quality = CHORD_QUALITIES[key.type][degree - 1];
  
  const chordRootIdx = (key.rootIdx + scale[degree - 1]) % 12;
  const rootName = ROOT_NOTES[chordRootIdx];
  
  let suffix = '';
  if (quality === 'min') suffix = 'm';
  if (quality === 'dim') suffix = 'dim';
  
  const chordName = rootName + suffix;

  const bassMidi = 24 + chordRootIdx; 
  const keysMidi = 60 + chordRootIdx; 
  const freqs = CHORD_OFFSETS[quality].map(offset => midiToFreq(keysMidi + offset));
  
  return { name: chordName, bassFreq: midiToFreq(bassMidi), freqs };
};

// --- AUDIO ENGINE SINGLETON ---

let audioCtx = null;
let masterGain = null;
let masterLimiter = null;
let mixLimiterNode = null;

let backingDest = null;
let mixDest = null;
let noiseBuffer = null;

const initAudio = async () => {
  if (audioCtx && audioCtx.state !== 'closed') {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    return;
  }
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioCtx = new AudioContextClass();
  
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.7;
  
  masterLimiter = audioCtx.createDynamicsCompressor();
  masterLimiter.threshold.value = -3.0;
  masterLimiter.ratio.value = 20.0;
  
  masterGain.connect(masterLimiter);
  masterLimiter.connect(audioCtx.destination); 
  
  backingDest = audioCtx.createMediaStreamDestination();
  masterLimiter.connect(backingDest);

  mixDest = audioCtx.createMediaStreamDestination();
  
  mixLimiterNode = audioCtx.createDynamicsCompressor();
  mixLimiterNode.threshold.value = -1.0;
  mixLimiterNode.ratio.value = 20.0;
  
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
  const types = ['audio/mp4', 'audio/webm', 'audio/ogg'];
  for (let t of types) {
    if (typeof window.MediaRecorder !== 'undefined' && window.MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
};

// --- WAV CONVERSION UTILS ---

const audioBufferToWav = (buffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; 
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

  const writeString = (view, offset, string) => {
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

const convertToWav = async (blob, ctx) => {
  try {
    if (blob.size === 0) return blob;
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    return audioBufferToWav(audioBuffer);
  } catch (err) {
    console.error("Failed to convert to WAV:", err);
    return blob;
  }
};

// --- DRAGGABLE UI COMPONENT ---

const DraggableCard = ({ label, value, subValue, onDelta }) => {
  const [isDragging, setIsDragging] = useState(false);
  const lastY = useRef(0);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    lastY.current = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaY = lastY.current - e.clientY; 
    if (Math.abs(deltaY) > 15) {
      onDelta(Math.sign(deltaY));
      lastY.current = e.clientY;
    }
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 backdrop-blur flex flex-col items-center justify-center relative touch-none select-none transition-colors group min-h-[6.5rem] h-full ${
        isDragging ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)] cursor-ns-resize' : 'cursor-ns-resize hover:border-slate-600'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <ChevronUp className="w-4 h-4 text-slate-500 opacity-30 group-hover:opacity-100 absolute top-2 transition-opacity" />
      <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 mt-2 font-medium">{label}</span>
      <span className="text-base sm:text-lg font-semibold text-center leading-tight w-full px-1">{value}</span>
      {subValue && <span className="text-[10px] sm:text-xs text-indigo-400 mt-1 w-full text-center">{subValue}</span>}
      <ChevronDown className="w-4 h-4 text-slate-500 opacity-30 group-hover:opacity-100 absolute bottom-2 transition-opacity" />
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---

export default function App() {
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [transportState, setTransportState] = useState('stopped'); 
  const [recordingState, setRecordingState] = useState('idle'); 
  const [showInstructions, setShowInstructions] = useState(true);
  const [activeTab, setActiveTab] = useState('mixer');

  // Core Musical State
  const [tempo, setTempo] = useState(110);
  const [styleIdx, setStyleIdx] = useState(0);
  const [progIdx, setProgIdx] = useState(0);
  const [keyIdx, setKeyIdx] = useState(0); 

  const currentStyle = STYLES[styleIdx] || STYLES[0];
  const currentProgression = PROGRESSIONS[progIdx] || PROGRESSIONS[0];
  const currentKey = ALL_KEYS[keyIdx] || ALL_KEYS[0];
  
  // Advanced Sound Design State
  const [instruments, setInstruments] = useState({
    metronome: false, drums: true, bass: true, chords: true, pad: false, arp: false
  });
  const [soundSettings, setSoundSettings] = useState({
    drumKit: 'standard', 
    bassSynth: 'sub', 
    chordSynth: 'epiano', 
    timbre: 50, 
    bassTimbre: 50,
    sustain: 50 
  });

  const stateRefs = useRef({ tempo, styleIdx, progIdx, keyIdx, instruments, soundSettings });
  useEffect(() => {
    stateRefs.current = { tempo, styleIdx, progIdx, keyIdx, instruments, soundSettings };
  }, [tempo, styleIdx, progIdx, keyIdx, instruments, soundSettings]);
  
  // Audio Exports
  const [vocalUrl, setVocalUrl] = useState(null);
  const [backingUrl, setBackingUrl] = useState(null);
  const [mixUrl, setMixUrl] = useState(null);
  
  // Playback Trackers
  const [currentBeat, setCurrentBeat] = useState(0);
  const [activeChordName, setActiveChordName] = useState('...');
  
  const currentBeatRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef(null);
  const barCountRef = useRef(0);
  
  const vocalRecorderRef = useRef(null);
  const backingRecorderRef = useRef(null);
  const mixRecorderRef = useRef(null);
  
  const vocalChunksRef = useRef([]);
  const backingChunksRef = useRef([]);
  const mixChunksRef = useRef([]);
  
  const micStreamRef = useRef(null);
  const micSourceNodeRef = useRef(null);

  const toggleInstrument = (inst) => {
    setInstruments(prev => ({ ...prev, [inst]: !prev[inst] }));
  };

  const updateSound = (key, value) => {
    setSoundSettings(prev => ({ ...prev, [key]: value }));
  };

  // --- SYNTHESIZERS ---

  const playClick = (time, isDownbeat) => {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = isDownbeat ? 1000 : 500;
    osc.connect(gain); gain.connect(masterGain);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    osc.start(time); osc.stop(time + 0.05);
  };

  const playKick = (time, kit) => {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(masterGain);
    
    if (kit === '808') {
      osc.frequency.setValueAtTime(100, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.8);
      gain.gain.setValueAtTime(1.0, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);
      osc.start(time); osc.stop(time + 0.8);
    } else if (kit === 'acoustic') {
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
      gain.gain.setValueAtTime(0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      osc.start(time); osc.stop(time + 0.2);
    } else { // standard
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time); osc.stop(time + 0.5);
    }
  };

  const playSnare = (time, kit) => {
    if (!audioCtx || !masterGain || !noiseBuffer) return;
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    const noiseGain = audioCtx.createGain();
    
    if (kit === '808') {
      noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1500;
      noiseGain.gain.setValueAtTime(1, time); noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    } else if (kit === 'acoustic') {
      noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 2000;
      noiseGain.gain.setValueAtTime(1, time); noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
    } else {
      noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1000;
      noiseGain.gain.setValueAtTime(1, time); noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    }

    noiseSource.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
    noiseSource.start(time); noiseSource.stop(time + 0.3);

    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.connect(oscGain); oscGain.connect(masterGain);
    
    if (kit === '808') {
      osc.frequency.setValueAtTime(300, time);
      oscGain.gain.setValueAtTime(0.8, time); oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    } else {
      osc.frequency.setValueAtTime(250, time);
      oscGain.gain.setValueAtTime(0.7, time); oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    }
    
    osc.start(time); osc.stop(time + 0.15);
  };

  const playHat = (time, kit) => {
    if (!audioCtx || !masterGain || !noiseBuffer) return;
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = kit === '808' ? 8000 : 7000;
    const noiseGain = audioCtx.createGain();
    noiseSource.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
    
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + (kit === '808' ? 0.03 : 0.05));
    noiseSource.start(time); noiseSource.stop(time + 0.1);
  };

  const playBass = (freq, time, duration, type, timbre) => {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    
    const cutoff = 150 + (timbre * 15); 

    if (type === 'sub') {
      osc.type = 'triangle';
      filter.type = 'lowpass'; filter.frequency.value = cutoff;
    } else if (type === 'pluck') {
      osc.type = 'square';
      filter.type = 'lowpass'; 
      filter.frequency.setValueAtTime(cutoff * 3, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + duration * 0.5);
    } else { // synth
      osc.type = 'sawtooth';
      filter.type = 'lowpass'; 
      filter.frequency.setValueAtTime(cutoff * 2, time);
      filter.frequency.exponentialRampToValueAtTime(150, time + duration);
    }

    osc.frequency.value = freq;
    osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
    
    gain.gain.setValueAtTime(0, time); 
    gain.gain.linearRampToValueAtTime(0.6, time + 0.02); 
    gain.gain.setValueAtTime(0.6, time + duration - 0.05); 
    gain.gain.linearRampToValueAtTime(0, time + duration); 
    
    osc.start(time); osc.stop(time + duration + 0.05);
  };

  const playKeys = (frequencies, time, duration, type, timbre) => {
    if (!audioCtx || !masterGain) return;
    const cutoff = 400 + (timbre * 36);

    frequencies.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;

      if (type === 'supersaw') osc.type = 'sawtooth';
      else if (type === 'retro') osc.type = 'square';
      else osc.type = 'sine';
      
      osc.frequency.value = freq;
      osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
      
      gain.gain.setValueAtTime(0, time); 
      gain.gain.linearRampToValueAtTime(type === 'supersaw' ? 0.08 : 0.15, time + 0.03); 
      gain.gain.setValueAtTime(type === 'supersaw' ? 0.08 : 0.15, time + duration); 
      gain.gain.linearRampToValueAtTime(0, time + duration + 0.3); 
      
      osc.start(time); osc.stop(time + duration + 0.35); 
    });
  };

  const playPad = (frequencies, time, duration, timbre) => {
    if (!audioCtx || !masterGain) return;
    const cutoff = 300 + (timbre * 17);
    frequencies.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      filter.type = 'lowpass'; filter.frequency.value = cutoff;
      
      osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.5); 
      gain.gain.setTargetAtTime(0, time + duration, 0.3); 
      
      osc.start(time); osc.stop(time + duration + 2.0);
    });
  };

  const playArp = (frequencies, time, stepDuration, beatNumber, timbre) => {
     if (!audioCtx || !masterGain) return;
     const note = frequencies[beatNumber % frequencies.length];
     const osc = audioCtx.createOscillator();
     const gain = audioCtx.createGain();
     const filter = audioCtx.createBiquadFilter();
     
     osc.type = 'square';
     osc.frequency.value = note * 2; 
     filter.type = 'lowpass';
     filter.frequency.setValueAtTime(100 + (timbre * 40), time);
     filter.frequency.exponentialRampToValueAtTime(200, time + stepDuration * 0.8);
     
     osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
     gain.gain.setValueAtTime(0.1, time);
     gain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);
     
     osc.start(time); osc.stop(time + stepDuration);
  };

  const playGuitar = (frequencies, time, duration) => {
    if (!audioCtx || !masterGain) return;
    frequencies.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain); gain.connect(masterGain);
      
      const strumDelay = time + (i * 0.02); 
      gain.gain.setValueAtTime(0, strumDelay);
      gain.gain.linearRampToValueAtTime(0.15, strumDelay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, strumDelay + duration);
      
      osc.start(strumDelay); osc.stop(strumDelay + duration + 0.1);
    });
  };

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

  const handleTempoChange = (delta) => setTempo(t => Math.max(60, Math.min(180, t + delta)));
  const handleStyleChange = (delta) => setStyleIdx(idx => (idx + delta + STYLES.length) % STYLES.length);
  const handleProgChange = (delta) => setProgIdx(idx => (idx + delta + PROGRESSIONS.length) % PROGRESSIONS.length);
  const handleKeyChange = (delta) => setKeyIdx(idx => (idx + delta + ALL_KEYS.length) % ALL_KEYS.length);

  const scheduleNote = useCallback((beatNumber, time) => {
    const { tempo, styleIdx, progIdx, keyIdx, instruments, soundSettings } = stateRefs.current;
    
    const style = STYLES[styleIdx] || STYLES[0];
    const progression = PROGRESSIONS[progIdx] || PROGRESSIONS[0];
    const stepDuration = (60.0 / tempo) * 0.25;
    
    const sustainMult = 0.2 + (soundSettings.sustain / 50); 
    
    const degree = progression.degrees[barCountRef.current % progression.degrees.length];
    const chordDetails = getChordDetails(keyIdx, degree);

    if (beatNumber % 4 === 0) {
      requestAnimationFrame(() => {
        setCurrentBeat(beatNumber / 4);
        setActiveChordName(chordDetails.name);
      });
    }

    if (instruments.metronome) {
       if (beatNumber % 4 === 0) playClick(time, beatNumber === 0);
    }

    if (instruments.drums) {
      if (style.kick[beatNumber]) playKick(time, soundSettings.drumKit);
      if (style.snare[beatNumber]) playSnare(time, soundSettings.drumKit);
      if (style.hat[beatNumber]) playHat(time, soundSettings.drumKit);
    }
    if (instruments.bass && style.bass[beatNumber]) {
      playBass(chordDetails.bassFreq, time, stepDuration * 0.9 * sustainMult, soundSettings.bassSynth, soundSettings.bassTimbre);
    }
    if (instruments.chords && style.keys[beatNumber]) {
      playKeys(chordDetails.freqs, time, stepDuration * 3.5 * sustainMult, soundSettings.chordSynth, soundSettings.timbre);
    }
    if (instruments.pad && (beatNumber === 0 || beatNumber === 8)) {
      playPad(chordDetails.freqs, time, stepDuration * 8, soundSettings.timbre);
    }
    if (instruments.arp) {
      playArp(chordDetails.freqs, time, stepDuration, beatNumber, soundSettings.timbre);
    }
    if (style.guitar && style.guitar[beatNumber]) {
      playGuitar(chordDetails.freqs, time, stepDuration * 4);
    }

  }, []);

  const nextNote = useCallback(() => {
    const { tempo } = stateRefs.current;
    const secondsPerBeat = 60.0 / tempo;
    nextNoteTimeRef.current += 0.25 * secondsPerBeat;
    currentBeatRef.current++;
    if (currentBeatRef.current === 16) {
      currentBeatRef.current = 0;
      barCountRef.current++;
    }
  }, []);

  const scheduler = useCallback(() => {
    if (!audioCtx || audioCtx.state === 'closed') return;
    while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
      scheduleNote(currentBeatRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = setTimeout(scheduler, 25.0);
  }, [scheduleNote, nextNote]);

  const startPlayback = async () => {
    if (!audioCtx) await initAudio();
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
    
    if (transportState === 'stopped') {
      const { progIdx, keyIdx } = stateRefs.current;
      const degree = PROGRESSIONS[progIdx].degrees[0];
      const chordDetails = getChordDetails(keyIdx, degree);
      setActiveChordName(chordDetails.name);
      currentBeatRef.current = 0;
      barCountRef.current = 0;
    }
    
    if (audioCtx && audioCtx.state !== 'closed') {
      nextNoteTimeRef.current = audioCtx.currentTime + 0.1;
      scheduler();
      setTransportState('playing');
    }
  };

  const handleStop = () => {
    if (timerIDRef.current) clearTimeout(timerIDRef.current);
    setTransportState('stopped');
    setCurrentBeat(0);
    barCountRef.current = 0;
    currentBeatRef.current = 0;
    setActiveChordName('...');

    if (recordingState !== 'idle') {
      if (micSourceNodeRef.current) {
        try { micSourceNodeRef.current.disconnect(); } catch (e) {}
        micSourceNodeRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (vocalRecorderRef.current?.state !== "inactive") vocalRecorderRef.current?.stop();
      if (backingRecorderRef.current?.state !== "inactive") backingRecorderRef.current?.stop();
      if (mixRecorderRef.current?.state !== "inactive") mixRecorderRef.current?.stop();
      setRecordingState('idle');
    }
  };

  const handlePlayPause = async () => {
    if (transportState === 'playing') {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      setTransportState('paused');
      
      if (recordingState === 'recording') {
        vocalRecorderRef.current?.pause();
        backingRecorderRef.current?.pause();
        mixRecorderRef.current?.pause();
        setRecordingState('paused');
      }
    } else {
      await startPlayback();
    }
  };

  const startNewRecordingSession = async () => {
    try {
      if (!audioCtx) await initAudio();
      if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      setVocalUrl(null); setBackingUrl(null); setMixUrl(null);

      if (micSourceNodeRef.current) {
        try { micSourceNodeRef.current.disconnect(); } catch (e) {}
        micSourceNodeRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
        });
        
        if (audioCtx && mixLimiterNode) {
          const micSource = audioCtx.createMediaStreamSource(micStreamRef.current);
          micSource.connect(mixLimiterNode);
          micSourceNodeRef.current = micSource;
        }

        vocalChunksRef.current = [];
        const vocalRecorder = new window.MediaRecorder(micStreamRef.current, options);
        vocalRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) vocalChunksRef.current.push(e.data); };
        vocalRecorder.onstop = async () => {
          if (micSourceNodeRef.current) {
            try { micSourceNodeRef.current.disconnect(); } catch (e) {}
            micSourceNodeRef.current = null;
          }
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
          }

          const blob = new Blob(vocalChunksRef.current, { type: mimeType || 'audio/mp4' });
          if (blob.size > 0 && audioCtx) {
            const wavBlob = await convertToWav(blob, audioCtx);
            setVocalUrl(URL.createObjectURL(wavBlob));
          }
        };
        vocalRecorderRef.current = vocalRecorder;
        vocalRecorder.start(); 
      } catch (micErr) {
        console.warn("Mic access denied.");
      }

      if (backingDest && audioCtx) {
        backingChunksRef.current = [];
        const backingRecorder = new window.MediaRecorder(backingDest.stream, options);
        backingRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) backingChunksRef.current.push(e.data); };
        backingRecorder.onstop = async () => {
          const blob = new Blob(backingChunksRef.current, { type: mimeType || 'audio/mp4' });
          if (audioCtx) {
            const wavBlob = await convertToWav(blob, audioCtx);
            setBackingUrl(URL.createObjectURL(wavBlob));
          }
        };
        backingRecorderRef.current = backingRecorder;
        backingRecorder.start();
      }

      if (mixDest && audioCtx) {
        mixChunksRef.current = [];
        const mixRecorder = new window.MediaRecorder(mixDest.stream, options);
        mixRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) mixChunksRef.current.push(e.data); };
        mixRecorder.onstop = async () => {
          const blob = new Blob(mixChunksRef.current, { type: mimeType || 'audio/mp4' });
          if (audioCtx) {
            const wavBlob = await convertToWav(blob, audioCtx);
            setMixUrl(URL.createObjectURL(wavBlob));
          }
        };
        mixRecorderRef.current = mixRecorder;
        mixRecorder.start();
      }

      setRecordingState('recording');
      if (transportState !== 'playing') await startPlayback();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordClick = async () => {
    if (recordingState === 'idle') {
      await startNewRecordingSession();
    } else if (recordingState === 'recording') {
      vocalRecorderRef.current?.pause();
      backingRecorderRef.current?.pause();
      mixRecorderRef.current?.pause();
      setRecordingState('paused');
    } else if (recordingState === 'paused') {
      vocalRecorderRef.current?.resume();
      backingRecorderRef.current?.resume();
      mixRecorderRef.current?.resume();
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
    setTempo(Math.floor(Math.random() * (maxTempo - minTempo + 0)) + minTempo);
  };

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    };
  }, []);

  useEffect(() => {
    const currentUrl = vocalUrl;
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [vocalUrl]);

  useEffect(() => {
    const currentUrl = backingUrl;
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [backingUrl]);

  useEffect(() => {
    const currentUrl = mixUrl;
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [mixUrl]);

  if (!stylesLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-indigo-400 font-sans">
        <p>Loading SongSketch Interface...</p>
      </div>
    );
  }

  // FIX: Switched from lg:flex-row-reverse to proper centering rules for medium tablet screens.
  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <header className="px-6 py-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-rose-400 bg-clip-text text-transparent">
            SongSketch
          </h1>
        </div>
        <button 
          onClick={() => setShowInstructions(!showInstructions)}
          className={`p-2 rounded-full transition-colors ${showInstructions ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-indigo-400'}`}
          title="Toggle Instructions"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      <div className="flex flex-col lg:flex-row-reverse max-w-6xl mx-auto items-center lg:items-start justify-center gap-8 px-4 sm:px-6 py-6 lg:py-12">
        
        {/* Sidebar Instructions */}
        {showInstructions && (
          <aside className="w-full max-w-md lg:w-72 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 lg:sticky lg:top-24 h-fit animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
               How to Start
            </h2>
            <ul className="space-y-6">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">1</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-slate-100 font-medium">Explore:</span> Swipe up or down on Style, Tempo, and Key cards to change settings.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">2</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-slate-100 font-medium">Create:</span> Tap the <span className="text-rose-400">red mic</span> to start recording. Use headphones for the best sound.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">3</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-slate-100 font-medium">Finish:</span> Tap the stop square to finalize your track and download it below.
                </div>
              </li>
            </ul>
          </aside>
        )}

        {/* Main App */}
        <main className="w-full max-w-md lg:max-w-lg space-y-6 pb-24">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-start gap-3 text-sm text-blue-300">
            <Headphones className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>For the best quality, use headphones while recording vocals.</p>
          </div>

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
                  <div key={beat} className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    transportState === 'playing' && currentBeat === beat 
                      ? (recordingState === 'recording' ? 'bg-rose-500 scale-125' : 'bg-indigo-500 scale-125') 
                      : 'bg-slate-700 scale-100'
                  }`} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative">
            <DraggableCard label="Song Style" value={currentStyle.name} onDelta={handleStyleChange} />
            <DraggableCard label="Tempo" value={`${tempo} BPM`} onDelta={handleTempoChange} />
            <DraggableCard label="Musical Key" value={`${currentKey.root} ${currentKey.type}`} onDelta={handleKeyChange} />
            <DraggableCard label="Progression" value={currentProgression.name} subValue={currentProgression.degrees.join(' - ')} onDelta={handleProgChange} />
          </div>

          {/* SOUND DESIGN PANEL */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden mt-6">
            <div className="flex border-b border-slate-700/50">
              <button onClick={() => setActiveTab('mixer')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'mixer' ? 'bg-slate-700/50 text-indigo-400' : 'text-slate-500 hover:bg-slate-800/80 hover:text-slate-300'}`}>
                <Sliders className="w-4 h-4" /> Mixer
              </button>
              <button onClick={() => setActiveTab('sounds')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'sounds' ? 'bg-slate-700/50 text-indigo-400' : 'text-slate-500 hover:bg-slate-800/80 hover:text-slate-300'}`}>
                <Settings className="w-4 h-4" /> Tweaks
              </button>
            </div>
            
            <div className="p-4">
              {activeTab === 'mixer' && (
                <div className="space-y-5">
                  <div className="flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                      { id: 'metronome', label: 'Click', icon: Bell },
                      { id: 'drums', label: 'Drums', icon: Drum },
                      { id: 'bass', label: 'Bass', icon: Speaker },
                      { id: 'chords', label: 'Chords', icon: Layers },
                      { id: 'pad', label: 'Pad', icon: Activity },
                      { id: 'arp', label: 'Arp', icon: Music },
                    ].map(inst => {
                      const Icon = inst.icon;
                      return (
                        <button 
                          key={inst.id}
                          onClick={() => toggleInstrument(inst.id)}
                          className={`flex flex-col items-center gap-2 min-w-[3.5rem] ${instruments[inst.id] ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                          <div className={`p-3 rounded-xl transition-all ${instruments[inst.id] ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : 'bg-slate-800'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold tracking-wider uppercase">{inst.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'sounds' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Drum Kit</label>
                      <select 
                        value={soundSettings.drumKit} 
                        onChange={(e) => updateSound('drumKit', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="standard">Standard</option>
                        <option value="808">808 / Trap</option>
                        <option value="acoustic">Acoustic</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Chord Synth</label>
                      <select 
                        value={soundSettings.chordSynth} 
                        onChange={(e) => updateSound('chordSynth', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="epiano">E-Piano</option>
                        <option value="supersaw">Super Saw</option>
                        <option value="retro">Retro Square</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Bass Synth</label>
                      <select 
                        value={soundSettings.bassSynth} 
                        onChange={(e) => updateSound('bassSynth', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="sub">Deep Sub</option>
                        <option value="synth">Sawtooth</option>
                        <option value="pluck">Square Pluck</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Overall Brightness</label>
                        <span className="text-[10px] text-indigo-400 font-mono">{soundSettings.timbre}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" 
                        value={soundSettings.timbre} 
                        onChange={(e) => updateSound('timbre', parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Bass Tone</label>
                        <span className="text-[10px] text-indigo-400 font-mono">{soundSettings.bassTimbre}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" 
                        value={soundSettings.bassTimbre} 
                        onChange={(e) => updateSound('bassTimbre', parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Note Sustain</label>
                        <span className="text-[10px] text-indigo-400 font-mono">{soundSettings.sustain}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" 
                        value={soundSettings.sustain} 
                        onChange={(e) => updateSound('sustain', parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center items-center gap-5 py-6">
            <button onClick={randomizeIdea} className="p-4 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95 shadow-lg border border-slate-700/50" title="Randomize All">
              <Shuffle className="w-5 h-5" />
            </button>
            
            <button onClick={handleStop} disabled={transportState === 'stopped' && recordingState === 'idle'} className={`p-4 rounded-full transition-all active:scale-95 shadow-lg ${
              transportState === 'stopped' && recordingState === 'idle'
                ? 'bg-slate-800/30 text-slate-700 cursor-not-allowed border border-transparent'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50'
            }`}>
              <Square className="w-5 h-5 fill-current" />
            </button>

            <button onClick={handleRecordClick} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
              recordingState === 'recording' ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)]' : 
              recordingState === 'paused' ? 'bg-rose-900 text-rose-300 border-2 border-rose-500' :
              'bg-slate-800 text-rose-500 border-2 border-slate-700 hover:border-rose-500/50'
            }`}>
               <Mic className={`w-9 h-9 ${recordingState === 'recording' ? 'animate-pulse' : ''}`} />
            </button>

            <button onClick={handlePlayPause} className={`p-5 rounded-full transition-all active:scale-95 shadow-lg ${
              transportState === 'playing' ? 'bg-indigo-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.4)]' : 
              'bg-slate-800 text-indigo-400 hover:bg-slate-700 border border-slate-700/50'
            }`}>
               {transportState === 'playing' ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 ml-1 fill-current" />}
            </button>
          </div>

          {(vocalUrl || backingUrl || mixUrl) && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-800 pb-3 text-indigo-300 uppercase tracking-widest">
                <Download className="w-4 h-4" /> Your Saved Ideas
              </h3>
              
              {mixUrl && (
                <div className="bg-emerald-900/20 rounded-2xl p-5 flex flex-col gap-3 shadow-lg border border-emerald-500/20">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Radio className="w-4 h-4" /> The Song (Full Mix)
                    </span>
                    <a href={mixUrl} download="songsketch_mix.wav" className="text-[10px] font-black bg-emerald-500 text-white px-4 py-2 rounded-full hover:bg-emerald-400 transition-colors shadow-lg uppercase tracking-tighter">
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
                      <a href={vocalUrl} download="songsketch_vocals.wav" className="text-[10px] font-bold bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors uppercase">Save</a>
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
                      <a href={backingUrl} download="songsketch_backing.wav" className="text-[10px] font-bold bg-slate-700 text-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-600 transition-colors uppercase">Save</a>
                    </div>
                    <audio key={backingUrl} src={backingUrl} controls className="w-full h-10 rounded-lg outline-none" />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


