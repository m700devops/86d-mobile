import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, X, Zap } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { track } from '../services/analytics';

// The owner's walkthrough of a real count, cut for the app (2026-10-29):
// - first-count-loop.mp4: 0:04–0:19, silent — snap the label, type the count,
//   AI names the bottle, three bottles in. Loops on the first-run start screen.
// - first-count-full.mp4: 0:00–0:30 with the voiceover, then "Order sent"
//   while "your distributors get the order by email" plays. The original's
//   App Store end card is gone (they already have the app), and so is the
//   "All Stocked!" screen it caught after sending — an app bug, fixed in the
//   same PR. Re-cut both from a fresh recording when the UI changes.
// Bundled, not streamed: a new bar's first look shouldn't wait on bar wifi.
const LOOP = require('../../assets/video/first-count-loop.mp4');
const FULL = require('../../assets/video/first-count-full.mp4');

// Portrait screen recording: 540 x 1168.
const ASPECT = 540 / 1168;

/**
 * The silent preview: the first three bottles of a real count, looping. Shows
 * the moves instead of describing them, right where the person decides
 * whether to tap Start. Tapping it opens the full video with sound.
 */
export function HowItWorksLoop({ width, onPress }: { width: number; onPress: () => void }) {
  const height = Math.round(width / ASPECT);
  const player = useVideoPlayer(LOOP, p => {
    p.loop = true;
    p.muted = true;
    // Never stop the bar's music for a silent preview.
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Watch how a count works, with sound"
      style={[styles.loopFrame, { width, height }]}
    >
      {/* Explicit size, not absoluteFill: on web the video element kept its
          natural 540x1168 inside the frame and showed only its top-left. */}
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        pointerEvents="none"
      />
      <View style={styles.loopBadge} pointerEvents="none">
        <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
        <Text style={styles.loopBadgeText}>Sound</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * The whole walkthrough with the voiceover, full screen. "Try 3 bottles now"
 * is on screen the whole time: the moment someone has watched it is the
 * moment they're most ready to do it.
 */
export function HowItWorksPlayer({ visible, onClose, onStart }: {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  const player = useVideoPlayer(FULL, p => {
    p.loop = false;
  });
  // Sized to fit the space it's given (contain, by hand): left to itself the
  // video took its height from its width and ran under the button below.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const fit = box && (box.w / box.h > ASPECT
    ? { width: Math.round(box.h * ASPECT), height: Math.round(box.h) }
    : { width: Math.round(box.w), height: Math.round(box.w / ASPECT) });

  useEffect(() => {
    if (visible) {
      track('how_video_opened');
      player.currentTime = 0;
      player.muted = false;
      player.play();
    } else {
      player.pause();
    }
  }, [visible, player]);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => track('how_video_finished'));
    return () => sub.remove();
  }, [player]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.playerScreen}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerTitle}>How a count works</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button" accessibilityLabel="Close video">
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View
          style={styles.playerVideoWrap}
          onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {fit && (
            <VideoView
              player={player}
              style={fit}
              contentFit="contain"
              nativeControls
              allowsPictureInPicture={false}
            />
          )}
        </View>
        <TouchableOpacity style={styles.playerCta} onPress={onStart} activeOpacity={0.85}>
          <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.playerCtaText}>Try 3 bottles now</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loopFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  loopBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  loopBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  playerScreen: { flex: 1, backgroundColor: COLORS.primaryDark },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  playerTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  playerVideoWrap: { flex: 1, marginHorizontal: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  playerCta: {
    marginHorizontal: 20,
    marginVertical: 16,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.accentPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playerCtaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
