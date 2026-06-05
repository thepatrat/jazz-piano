// ============================================================
//  rhythmScore.js — onset-to-grid timing scorer.
//  Compares a MIDI note-on timestamp (AudioContext time) against
//  the nearest beat in the transport, and buckets the deviation.
//  Feeds into FSRS grading so playing in time is rewarded.
// ============================================================
import { nearestBeatTime, isRunning } from './transport.js';
import { Rating } from './srs.js';

// Score a single onset. Returns { deviationMs, bucket }.
export function scoreOnset(audioTime) {
  if (!isRunning()) return { deviationMs: 0, bucket: 'none' };
  const nearest = nearestBeatTime(audioTime);
  const deviationMs = Math.abs(audioTime - nearest) * 1000;
  let bucket;
  if (deviationMs < 30) bucket = 'perfect';
  else if (deviationMs < 60) bucket = 'good';
  else if (deviationMs < 120) bucket = 'ok';
  else bucket = 'miss';
  return { deviationMs, bucket };
}

// Average a list of buckets into a single representative bucket.
export function averageBucket(buckets) {
  if (!buckets.length) return 'none';
  const scores = { perfect: 3, good: 2, ok: 1, miss: 0, none: 2 };
  const avg = buckets.reduce((s, b) => s + (scores[b] ?? 2), 0) / buckets.length;
  if (avg >= 2.5) return 'perfect';
  if (avg >= 1.5) return 'good';
  if (avg >= 0.5) return 'ok';
  return 'miss';
}

// Map a rhythm bucket to an FSRS Rating.
export function bucketToRating(bucket) {
  switch (bucket) {
    case 'perfect': return Rating.Easy;
    case 'good': return Rating.Good;
    case 'ok': return Rating.Hard;
    case 'miss': return Rating.Again;
    default: return Rating.Good;
  }
}

// Emoji indicator for UI feedback.
export function bucketEmoji(bucket) {
  switch (bucket) {
    case 'perfect': return '🎯';
    case 'good': return '👍';
    case 'ok': return '⏱';
    case 'miss': return '💨';
    default: return '';
  }
}
