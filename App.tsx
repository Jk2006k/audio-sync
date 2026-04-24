import { StatusBar } from 'expo-status-bar';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  formatDuration,
  getPhaseOneStep,
  getRecordingProgress,
  getSavedRecordingUri,
  PHASE_ONE_RECORDING_SECONDS,
  type PhaseOnePermission,
} from './src/phaseOneRecording';

export default function App() {
  const [permission, setPermission] = useState<PhaseOnePermission>('unknown');
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError) {
      setErrorMessage(status.error ?? 'Recording stopped unexpectedly.');
      return;
    }

    if (status.isFinished) {
      setSavedUri((currentUri) => currentUri ?? status.url);
    }
  });
  const recorderState = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(savedUri, { keepAudioSessionActive: true });
  const playerStatus = useAudioPlayerStatus(player);

  const step = getPhaseOneStep({
    permission,
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis,
    savedUri,
    isPlaying: playerStatus.playing,
    errorMessage,
  });
  const progress = getRecordingProgress(recorderState.durationMillis);
  const progressWidth: `${number}%` = `${Math.round(progress * 100)}%`;

  const statusCopy = useMemo(() => {
    if (isStarting) {
      return 'Asking for microphone access...';
    }

    switch (step) {
      case 'permissionDenied':
        return 'Microphone access was denied. Enable it in system settings to record.';
      case 'recording':
        return 'Recording the 60 second Phase 1 sample.';
      case 'saved':
        return 'Recording saved. Play it back and listen for gaps or noise.';
      case 'playing':
        return 'Playing saved recording.';
      case 'error':
        return errorMessage ?? 'Something went wrong while recording.';
      default:
        return 'Record one minute locally before adding sync or networking.';
    }
  }, [errorMessage, isStarting, step]);

  const startRecording = async () => {
    setIsStarting(true);
    setErrorMessage(null);
    setSavedUri(null);

    try {
      const permissionResult = await requestRecordingPermissionsAsync();
      if (!permissionResult.granted) {
        setPermission('denied');
        return;
      }

      setPermission('granted');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: PHASE_ONE_RECORDING_SECONDS });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start recording.');
    } finally {
      setIsStarting(false);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      setSavedUri(getSavedRecordingUri(recorder.uri, recorder.getStatus().url));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to stop recording.');
    }
  };

  const playRecording = async () => {
    if (!savedUri) {
      return;
    }

    try {
      await player.seekTo(0);
      player.play();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to play the saved recording.');
    }
  };

  const canRecord = !isStarting && !recorderState.isRecording;
  const canPlay = Boolean(savedUri) && !recorderState.isRecording;

  return (
    <View className="flex-1 bg-stone-50 px-6 py-16">
      <View className="flex-1 justify-center">
        <Text className="text-sm font-semibold uppercase tracking-widest text-teal-700">Audio Sync</Text>
        <Text className="mt-3 text-4xl font-bold text-zinc-950">Phase 1 recorder</Text>
        <Text className="mt-4 text-base leading-6 text-zinc-600">{statusCopy}</Text>

        <View className="mt-10 rounded-lg border border-zinc-200 bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-zinc-500">Target</Text>
            <Text className="text-sm font-semibold text-zinc-950">
              {formatDuration(recorderState.durationMillis)} / 1:00
            </Text>
          </View>

          <View className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100">
            <View className="h-3 rounded-full bg-teal-600" style={{ width: progressWidth }} />
          </View>

          {savedUri ? (
            <Text className="mt-4 text-xs leading-5 text-zinc-500" numberOfLines={2}>
              Saved to {savedUri}
            </Text>
          ) : null}
        </View>

        <View className="mt-6 gap-3">
          <Pressable
            accessibilityRole="button"
            className={`h-14 items-center justify-center rounded-md ${
              canRecord ? 'bg-zinc-950' : 'bg-zinc-300'
            }`}
            disabled={!canRecord}
            onPress={startRecording}
          >
            {isStarting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Record 60 seconds</Text>
            )}
          </Pressable>

          {recorderState.isRecording ? (
            <Pressable
              accessibilityRole="button"
              className="h-14 items-center justify-center rounded-md border border-zinc-300 bg-white"
              onPress={stopRecording}
            >
              <Text className="text-base font-semibold text-zinc-950">Stop and save</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            className={`h-14 items-center justify-center rounded-md border ${
              canPlay ? 'border-teal-700 bg-white' : 'border-zinc-200 bg-zinc-100'
            }`}
            disabled={!canPlay}
            onPress={playRecording}
          >
            <Text className={`text-base font-semibold ${canPlay ? 'text-teal-800' : 'text-zinc-400'}`}>
              Play saved recording
            </Text>
          </Pressable>
        </View>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}
