import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Alert, Platform,
} from "react-native";
import { Audio } from "expo-av";
import { fetchChunks, updateChunkStatus, chunkAudioUrl } from "../api";
import { colors, radius } from "../theme";

const ICON = {
  play: "▶", pause: "⏸", stop: "⏹",
  record: "🔴", replay: "🔁",
  prev: "◀", next: "▶▶",
  good: "✓", needs: "↻",
};

export default function PracticeScreen({ route, navigation }) {
  const { lessonId, lessonName } = route.params;
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playback, setPlayback] = useState("idle"); // idle | playing | paused
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [markedStatus, setMarkedStatus] = useState({}); // chunkId -> status

  const soundRef = useRef(null);
  const recordRef = useRef(null);
  const recordingUriRef = useRef(null);
  const playbackRecRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: lessonName });
    fetchChunks(lessonId).then((data) => {
      setChunks(data);
      setLoading(false);
    });
    Audio.requestPermissionsAsync();
    return () => {
      soundRef.current?.unloadAsync();
      recordRef.current?.stopAndUnloadAsync();
      playbackRecRef.current?.unloadAsync();
    };
  }, []);

  const chunk = chunks[currentIdx];

  async function stopAll() {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (playbackRecRef.current) {
      await playbackRecRef.current.stopAsync().catch(() => {});
      await playbackRecRef.current.unloadAsync().catch(() => {});
      playbackRecRef.current = null;
    }
    setPlayback("idle");
  }

  async function playOriginal() {
    await stopAll();
    if (!chunk) return;
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri: chunkAudioUrl(chunk.id) },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setPlayback("playing");
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) setPlayback("idle");
    });
  }

  async function pauseOriginal() {
    if (soundRef.current) {
      const s = await soundRef.current.getStatusAsync();
      if (s.isPlaying) {
        await soundRef.current.pauseAsync();
        setPlayback("paused");
      } else {
        await soundRef.current.playAsync();
        setPlayback("playing");
      }
    }
  }

  async function startRecording() {
    await stopAll();
    if (recording) return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordRef.current = rec;
    setRecording(true);
  }

  async function stopRecording() {
    if (!recordRef.current) return;
    await recordRef.current.stopAndUnloadAsync();
    const uri = recordRef.current.getURI();
    recordRef.current = null;
    recordingUriRef.current = uri;
    setRecording(false);
    setHasRecording(true);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }

  async function playRecording() {
    if (!recordingUriRef.current) return;
    await stopAll();
    const { sound } = await Audio.Sound.createAsync(
      { uri: recordingUriRef.current },
      { shouldPlay: true }
    );
    playbackRecRef.current = sound;
    setPlayback("playingRec");
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) setPlayback("idle");
    });
  }

  async function goTo(idx) {
    await stopAll();
    if (recording) await stopRecording();
    setHasRecording(false);
    recordingUriRef.current = null;
    setCurrentIdx(Math.max(0, Math.min(chunks.length - 1, idx)));
  }

  async function markStatus(status) {
    if (!chunk) return;
    await updateChunkStatus(chunk.id, status);
    setMarkedStatus((prev) => ({ ...prev, [chunk.id]: status }));
    if (currentIdx < chunks.length - 1) goTo(currentIdx + 1);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }
  if (!chunk) {
    return <View style={styles.center}><Text style={styles.muted}>No chunks available.</Text></View>;
  }

  const mark = chunk ? markedStatus[chunk.id] : null;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${((currentIdx + 1) / chunks.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Counter */}
        <Text style={styles.counter}>{currentIdx + 1} / {chunks.length}</Text>

        {/* Section info */}
        <Text style={styles.sectionLabel}>
          Section {chunk.big_idx + 1} · Chunk {chunk.idx + 1} · {chunk.duration}s
        </Text>

        {/* Text card */}
        <View style={styles.textCard}>
          <Text style={styles.chunkText}>{chunk.text}</Text>
        </View>

        {/* Original audio controls */}
        <Text style={styles.sectionHeader}>Original</Text>
        <View style={styles.row}>
          <Btn
            label={playback === "playing" ? "Pause" : "Play"}
            icon={playback === "playing" ? ICON.pause : ICON.play}
            color={colors.accent}
            onPress={playback === "playing" ? pauseOriginal : playOriginal}
          />
        </View>

        {/* Recording controls */}
        <Text style={styles.sectionHeader}>Your Recording</Text>
        <View style={styles.row}>
          {!recording ? (
            <Btn label="Record" icon={ICON.record} color={colors.accent2} onPress={startRecording} />
          ) : (
            <Btn label="Stop" icon={ICON.stop} color="#c0392b" onPress={stopRecording} />
          )}
          {hasRecording && (
            <Btn label="Play Back" icon={ICON.replay} color={colors.needs} onPress={playRecording} />
          )}
        </View>

        {/* Mark */}
        <Text style={styles.sectionHeader}>Mark</Text>
        <View style={styles.row}>
          <Btn
            label="Good"
            icon={ICON.good}
            color={mark === "good" ? colors.good : colors.surface2}
            textColor={mark === "good" ? "#fff" : colors.good}
            onPress={() => markStatus("good")}
          />
          <Btn
            label="Needs Practice"
            icon={ICON.needs}
            color={mark === "needs_practice" ? colors.needs : colors.surface2}
            textColor={mark === "needs_practice" ? "#fff" : colors.needs}
            onPress={() => markStatus("needs_practice")}
          />
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navBar}>
        <NavBtn label="Prev" onPress={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} />
        <Text style={styles.navCounter}>{currentIdx + 1}/{chunks.length}</Text>
        <NavBtn label="Next" onPress={() => goTo(currentIdx + 1)} disabled={currentIdx === chunks.length - 1} right />
      </View>
    </View>
  );
}

function Btn({ label, icon, color, textColor, onPress }) {
  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.btnText, textColor ? { color: textColor } : {}]}>{icon}  {label}</Text>
    </TouchableOpacity>
  );
}

function NavBtn({ label, onPress, disabled, right }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.navBtn, disabled && { opacity: 0.3 }]}
    >
      <Text style={styles.navBtnText}>{right ? `${label} ▶` : `◀ ${label}`}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: colors.muted },
  progressWrap: { height: 4, backgroundColor: colors.surface2 },
  progressFill: { height: 4, backgroundColor: colors.accent },
  content: { padding: 20, gap: 12 },
  counter: { color: colors.muted, fontSize: 13, textAlign: "center" },
  sectionLabel: { color: colors.muted, fontSize: 12, textAlign: "center" },
  textCard: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: 20,
    marginVertical: 8,
  },
  chunkText: { color: colors.text, fontSize: 18, lineHeight: 28, textAlign: "center" },
  sectionHeader: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 8 },
  row: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.surface2,
  },
  navBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  navBtnText: { color: colors.accent, fontWeight: "700", fontSize: 15 },
  navCounter: { color: colors.muted, fontSize: 13 },
});
