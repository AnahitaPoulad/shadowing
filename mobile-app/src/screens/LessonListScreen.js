import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchLessons } from "../api";
import { colors, radius } from "../theme";

function statusColor(s) {
  if (s === "ready") return colors.good;
  if (s?.startsWith("error")) return colors.accent2;
  return colors.needs;
}

export default function LessonListScreen({ navigation }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await fetchLessons();
      setLessons(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function onRefresh() { setRefreshing(true); load(); }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lessons.filter((l) => l.status === "ready")}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>No lessons available yet.{"\n"}Upload one via the web app.</Text>
          </View>
        }
        renderItem={({ item: l }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Practice", { lessonId: l.id, lessonName: l.name })}>
            <View style={styles.cardHeader}>
              <Text style={styles.lessonName}>{l.name}</Text>
              <View style={[styles.dot, { backgroundColor: statusColor(l.status) }]} />
            </View>
            {l.description ? <Text style={styles.desc}>{l.description}</Text> : null}
            <View style={styles.meta}>
              <Text style={styles.metaText}>{l.big_chunk_count} sections</Text>
              <Text style={styles.metaText}>{l.fine_chunk_count} chunks</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  empty: { color: colors.muted, textAlign: "center", lineHeight: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: 16,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lessonName: { color: colors.text, fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  desc: { color: colors.muted, fontSize: 13, marginTop: 4 },
  meta: { flexDirection: "row", gap: 16, marginTop: 10 },
  metaText: { color: colors.muted, fontSize: 12 },
});
