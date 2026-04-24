import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchStats } from "../api";
import { colors, radius } from "../theme";

function ago(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StatsScreen() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await fetchStats();
      setStats(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const good = stats.filter((s) => s.status === "good").length;
  const needs = stats.filter((s) => s.status === "needs_practice").length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Summary cards */}
      <View style={styles.summary}>
        <View style={[styles.summaryCard, { borderColor: colors.good }]}>
          <Text style={[styles.summaryNum, { color: colors.good }]}>{good}</Text>
          <Text style={styles.summaryLabel}>Good</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.needs }]}>
          <Text style={[styles.summaryNum, { color: colors.needs }]}>{needs}</Text>
          <Text style={styles.summaryLabel}>Needs Practice</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.accent }]}>
          <Text style={[styles.summaryNum, { color: colors.accent }]}>{stats.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <Text style={styles.listHeader}>Recent Activity</Text>

      <FlatList
        data={stats}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>No practice sessions yet.</Text>
          </View>
        }
        renderItem={({ item: s }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText} numberOfLines={2}>{s.text}</Text>
              <Text style={styles.rowMeta}>{s.lesson_name} · §{s.big_idx + 1}.{s.idx + 1} · {s.duration}s</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <View style={[styles.badge, { backgroundColor: s.status === "good" ? "#1a4a35" : "#2a2a1a" }]}>
                <Text style={[styles.badgeText, { color: s.status === "good" ? colors.good : colors.needs }]}>
                  {s.status === "good" ? "Good" : "Needs"}
                </Text>
              </View>
              <Text style={styles.rowTime}>{ago(s.recorded_at)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  empty: { color: colors.muted, textAlign: "center" },
  summary: { flexDirection: "row", gap: 12, padding: 16 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius,
    padding: 14, alignItems: "center", borderWidth: 1,
  },
  summaryNum: { fontSize: 28, fontWeight: "800" },
  summaryLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  listHeader: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 16 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: 8, padding: 12,
  },
  rowText: { color: colors.text, fontSize: 13 },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  rowTime: { color: colors.muted, fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});
