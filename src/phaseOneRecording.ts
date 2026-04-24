export const PHASE_ONE_RECORDING_SECONDS = 60;

export type PhaseOnePermission = 'unknown' | 'granted' | 'denied';

export type PhaseOneStep =
  | 'idle'
  | 'requestingPermission'
  | 'permissionDenied'
  | 'recording'
  | 'saved'
  | 'playing'
  | 'error';

export type PhaseOneSnapshot = {
  permission: PhaseOnePermission;
  isRecording: boolean;
  durationMillis: number;
  savedUri: string | null;
  isPlaying: boolean;
  errorMessage: string | null;
};

export function getPhaseOneStep(snapshot: PhaseOneSnapshot): PhaseOneStep {
  if (snapshot.errorMessage) {
    return 'error';
  }

  if (snapshot.permission === 'denied') {
    return 'permissionDenied';
  }

  if (snapshot.isRecording) {
    return 'recording';
  }

  if (snapshot.isPlaying && snapshot.savedUri) {
    return 'playing';
  }

  if (snapshot.savedUri) {
    return 'saved';
  }

  return 'idle';
}

export function getRecordingProgress(durationMillis: number): number {
  const targetMillis = PHASE_ONE_RECORDING_SECONDS * 1000;
  return Math.min(1, Math.max(0, durationMillis / targetMillis));
}

export function formatDuration(durationMillis: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getSavedRecordingUri(recorderUri: string | null, statusUrl: string | null): string | null {
  return recorderUri ?? statusUrl;
}
