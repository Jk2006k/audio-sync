import { describe, expect, test } from 'bun:test';

import {
  formatDuration,
  getPhaseOneStep,
  getRecordingProgress,
  getSavedRecordingUri,
  PHASE_ONE_RECORDING_SECONDS,
  type PhaseOneSnapshot,
} from './phaseOneRecording';

const baseSnapshot: PhaseOneSnapshot = {
  permission: 'unknown',
  isRecording: false,
  durationMillis: 0,
  savedUri: null,
  isPlaying: false,
  errorMessage: null,
};

describe('phase one recording helpers', () => {
  test('uses a one minute target recording duration', () => {
    expect(PHASE_ONE_RECORDING_SECONDS).toBe(60);
  });

  test('moves through the visible recording states', () => {
    expect(getPhaseOneStep(baseSnapshot)).toBe('idle');
    expect(getPhaseOneStep({ ...baseSnapshot, permission: 'denied' })).toBe('permissionDenied');
    expect(getPhaseOneStep({ ...baseSnapshot, isRecording: true })).toBe('recording');
    expect(getPhaseOneStep({ ...baseSnapshot, savedUri: 'file:///recording.m4a' })).toBe('saved');
    expect(
      getPhaseOneStep({
        ...baseSnapshot,
        savedUri: 'file:///recording.m4a',
        isPlaying: true,
      }),
    ).toBe('playing');
    expect(getPhaseOneStep({ ...baseSnapshot, errorMessage: 'Microphone failed' })).toBe('error');
  });

  test('formats and clamps recording progress for the one minute check', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9150)).toBe('0:09');
    expect(formatDuration(60_000)).toBe('1:00');

    expect(getRecordingProgress(-50)).toBe(0);
    expect(getRecordingProgress(30_000)).toBe(0.5);
    expect(getRecordingProgress(75_000)).toBe(1);
  });

  test('uses the completed recorder URI when a recording is saved', () => {
    expect(getSavedRecordingUri('file:///from-recorder.m4a', 'file:///from-status.m4a')).toBe(
      'file:///from-recorder.m4a',
    );
    expect(getSavedRecordingUri(null, 'file:///from-status.m4a')).toBe('file:///from-status.m4a');
    expect(getSavedRecordingUri(null, null)).toBeNull();
  });
});
