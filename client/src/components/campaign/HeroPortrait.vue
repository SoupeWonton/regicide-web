<script setup lang="ts">
// Hand-built vector busts for the nine classes — classic D&D silhouettes
// (knight, plague doctor, headsman, seer…) in the game's palette. Flat-shaded
// inline SVG: zero assets, crisp at any size. A PNG dropped in
// /public/portraits/<classId>.png overrides these (see EncounterBoard).
defineProps<{ classId: string }>()
</script>

<template>
  <svg viewBox="0 0 64 64" class="w-full h-full block" aria-hidden="true">
    <!-- backdrop + halo -->
    <rect width="64" height="64" fill="#14102a" />
    <circle cx="32" cy="30" r="26" fill="#1d1738" />
    <circle cx="32" cy="30" r="18" fill="#241d44" opacity="0.55" />

    <!-- ══ SENTINEL — full-helm knight ══ -->
    <g v-if="classId === 'sentinel'">
      <path d="M6 64 Q10 46 32 45 Q54 46 58 64 Z" fill="#6b7484" />
      <path d="M6 64 Q10 46 32 45 L32 64 Z" fill="#7d8798" />
      <path d="M9 59 Q20 50 32 49 Q44 50 55 59 L55 62 Q44 53 32 52 Q20 53 9 62 Z" fill="#c9a227" opacity="0.85" />
      <rect x="27" y="38" width="10" height="8" fill="#3d4350" />
      <path d="M21 32 a11 13 0 1 1 22 0 v7 h-22 z" fill="#8d97a8" />
      <path d="M32 19 a11 13 0 0 1 11 13 v7 h-11 z" fill="#6f7888" />
      <path d="M32 12 q6 2 5 9 l-5 -2 -5 2 q-1 -7 5 -9 z" fill="#c9a227" />
      <rect x="23.5" y="28.5" width="17" height="3" rx="1.5" fill="#10121a" />
      <circle cx="24" cy="36" r="0.8" fill="#454d5c" /><circle cx="40" cy="36" r="0.8" fill="#454d5c" />
    </g>

    <!-- ══ QUARTERMASTER — bearded supply officer ══ -->
    <g v-else-if="classId === 'quartermaster'">
      <path d="M6 64 Q10 47 32 46 Q54 47 58 64 Z" fill="#6e4f2e" />
      <path d="M6 64 Q10 47 32 46 L32 64 Z" fill="#7d5c38" />
      <path d="M14 64 L44 47 L48 50 L20 64 Z" fill="#4a3119" />
      <circle cx="35" cy="52" r="1.6" fill="#c9a227" />
      <rect x="28" y="36" width="8" height="7" fill="#b9824f" />
      <circle cx="32" cy="27" r="10" fill="#d9a877" />
      <path d="M32 17 a10 10 0 0 1 0 20 z" fill="#c08c55" opacity="0.55" />
      <path d="M22 30 q0 13 10 13 q10 0 10 -13 q-5 4 -10 4 q-5 0 -10 -4 z" fill="#8a5a32" />
      <path d="M21 25 a11 8 0 0 1 22 0 l-1.5 2.5 h-19 z" fill="#5d4124" />
      <circle cx="28" cy="27" r="1.2" fill="#2a1d12" /><circle cx="36" cy="27" r="1.2" fill="#2a1d12" />
    </g>

    <!-- ══ SURGEON — plague doctor ══ -->
    <g v-else-if="classId === 'surgeon'">
      <path d="M6 64 Q10 47 32 46 Q54 47 58 64 Z" fill="#3b3050" />
      <path d="M9 59 Q20 51 32 50 Q44 51 55 59 L55 61 Q44 53 32 52 Q20 53 9 61 Z" fill="#6a5a8a" opacity="0.7" />
      <circle cx="32" cy="27" r="12.5" fill="#2e2741" />
      <circle cx="33" cy="28" r="9.5" fill="#211b32" />
      <path d="M27 24 q10 -2 14 3 l-8 13 q-8 -6 -6 -16 z" fill="#e3dac2" />
      <path d="M41 27 l-8 13 q-3 -2 -4 -6 l9 -8 z" fill="#cfc3a4" />
      <circle cx="28.5" cy="25" r="3" fill="#8fb2c6" stroke="#b39136" stroke-width="1.1" />
      <circle cx="27.6" cy="24.2" r="0.9" fill="#e8f2f8" />
      <line x1="25" y1="22" x2="22" y2="20" stroke="#54392a" stroke-width="1.1" />
    </g>

    <!-- ══ EXECUTIONER — hooded headsman ══ -->
    <g v-else-if="classId === 'executioner'">
      <path d="M6 64 Q12 46 32 45 Q52 46 58 64 Z" fill="#c89058" />
      <path d="M6 64 Q12 46 32 45 L32 64 Z" fill="#d9a877" />
      <path d="M12 64 L46 48 L49 52 L18 64 Z" fill="#2a2018" />
      <path d="M52 64 L18 48 L15 52 L46 64 Z" fill="#2a2018" />
      <path d="M32 12 q12 2 11 16 a11 9 0 0 1 -22 0 q-1 -14 11 -16 z" fill="#1b1722" />
      <path d="M32 12 q12 2 11 16 l-11 6 z" fill="#13101a" />
      <path d="M25.5 27 q2 -1.6 4 0 q-2 1.6 -4 0 z" fill="#cdbf9a" />
      <path d="M34.5 27 q2 -1.6 4 0 q-2 1.6 -4 0 z" fill="#cdbf9a" />
      <line x1="26" y1="17" x2="38" y2="16" stroke="#0d0b12" stroke-width="0.8" stroke-dasharray="1.5 1.5" />
    </g>

    <!-- ══ COMMANDER — plumed officer ══ -->
    <g v-else-if="classId === 'commander'">
      <path d="M6 64 Q10 47 32 46 Q54 47 58 64 Z" fill="#7d2a2a" />
      <path d="M9 59 Q20 51 32 50 Q44 51 55 59 L55 61 Q44 53 32 52 Q20 53 9 61 Z" fill="#c9a227" opacity="0.85" />
      <rect x="28" y="36" width="8" height="8" fill="#b9824f" />
      <circle cx="32" cy="28" r="9.5" fill="#d9a877" />
      <path d="M22 14 q10 -9 20 0 q2 2 1.5 5 q-11 -7 -23 0 q-0.5 -3 1.5 -5 z" fill="#a23636" />
      <path d="M24 16 q8 -6 16 0 l-1 2 q-7 -5 -14 0 z" fill="#c14444" />
      <path d="M22 25 a10 7 0 0 1 20 0 l-2 1.5 h-16 z" fill="#8d97a8" />
      <path d="M22 25 h20 v1.6 h-20 z" fill="#c9a227" />
      <rect x="21" y="26" width="3" height="11" rx="1.2" fill="#8d97a8" />
      <rect x="40" y="26" width="3" height="11" rx="1.2" fill="#8d97a8" />
      <path d="M26.5 28.5 l4 -1" stroke="#3a2a18" stroke-width="1.3" />
      <path d="M37.5 28.5 l-4 -1" stroke="#3a2a18" stroke-width="1.3" />
      <circle cx="28.5" cy="30" r="1.1" fill="#2a1d12" /><circle cx="35.5" cy="30" r="1.1" fill="#2a1d12" />
    </g>

    <!-- ══ WARDEN — lantern keeper in a deep cowl ══ -->
    <g v-else-if="classId === 'warden'">
      <path d="M6 64 Q10 46 32 45 Q54 46 58 64 Z" fill="#3f6b63" />
      <path d="M6 64 Q10 46 32 45 L32 64 Z" fill="#4a7d73" />
      <circle cx="32" cy="26" r="12" fill="#35594f" />
      <circle cx="32" cy="27.5" r="9" fill="#14201d" />
      <path d="M24.5 31 a9 6 0 0 0 15 0 q-3.5 4 -7.5 4 q-4 0 -7.5 -4 z" fill="#e8b06f" />
      <path d="M29 33.5 q3 1.4 6 0" stroke="#7a4f28" stroke-width="0.9" fill="none" />
      <circle cx="32" cy="51" r="6" fill="#c98a2e" opacity="0.22" />
      <circle cx="32" cy="51" r="3.4" fill="#c98a2e" />
      <circle cx="32" cy="51" r="1.5" fill="#ffd98a" />
    </g>

    <!-- ══ GAMBLER — feathered rogue ══ -->
    <g v-else-if="classId === 'gambler'">
      <path d="M6 64 Q10 47 32 46 Q54 47 58 64 Z" fill="#5b3a78" />
      <path d="M9 59 Q20 51 32 50 Q44 51 55 59 L55 61 Q44 53 32 52 Q20 53 9 61 Z" fill="#c9a227" opacity="0.7" />
      <rect x="28" y="36" width="8" height="8" fill="#b9824f" />
      <circle cx="32" cy="28" r="9.5" fill="#d9a877" />
      <path d="M30 36 l2 2 l2 -2 q-2 1 -4 0 z" fill="#4a2e16" />
      <path d="M27 31.5 q3 2 6.5 0.5" stroke="#7a4f28" stroke-width="1" fill="none" />
      <circle cx="28.5" cy="27" r="1.1" fill="#2a1d12" />
      <path d="M34 27 l3.4 0" stroke="#2a1d12" stroke-width="1.2" />
      <path d="M26.5 24.5 l4 -0.8" stroke="#3a2a18" stroke-width="1" />
      <path d="M33.5 23.2 l4 1.4" stroke="#3a2a18" stroke-width="1" />
      <ellipse cx="32" cy="19.5" rx="14" ry="3.4" fill="#3f2a55" />
      <path d="M24 19.5 q1 -8 8 -8 q7 0 8 8 z" fill="#4a3163" />
      <rect x="24.5" y="17" width="15" height="2" fill="#c9a227" />
      <path d="M40 18 q7 -6 9 -11 q1 6 -5 12 z" fill="#c9a227" opacity="0.9" />
    </g>

    <!-- ══ EXILE — ember-eyed outcast ══ -->
    <g v-else-if="classId === 'exile'">
      <path d="M6 64 L10 56 L14 62 L18 54 L23 61 L28 55 L32 62 L37 55 L42 61 L47 54 L51 62 L55 56 L58 64 Z" fill="#3a332e" />
      <path d="M6 64 Q12 48 32 47 Q52 48 58 64 Z" fill="#4a443f" opacity="0.85" />
      <circle cx="32" cy="26" r="11.5" fill="#57504a" />
      <path d="M21 31 l3 3 l2.5 -3 l3 3.5 l2.5 -3 l3 3 l2.5 -3.5 l3 3 l2.5 -3 a11.5 11.5 0 0 1 -22 0 z" fill="#3f3933" />
      <circle cx="32" cy="27" r="8.5" fill="#241b16" />
      <circle cx="28.5" cy="26.5" r="2.6" fill="#ff9a3d" opacity="0.3" />
      <circle cx="35.5" cy="26.5" r="2.6" fill="#ff9a3d" opacity="0.3" />
      <circle cx="28.5" cy="26.5" r="1.3" fill="#ffb35c" />
      <circle cx="35.5" cy="26.5" r="1.3" fill="#ffb35c" />
      <line x1="36" y1="30" x2="39" y2="33.5" stroke="#6b5a4a" stroke-width="1" />
    </g>

    <!-- ══ ORACLE — blindfolded seer ══ -->
    <g v-else-if="classId === 'oracle'">
      <path d="M6 64 Q10 47 32 46 Q54 47 58 64 Z" fill="#b9b2cf" />
      <path d="M9 59 Q20 51 32 50 Q44 51 55 59 L55 61 Q44 53 32 52 Q20 53 9 61 Z" fill="#7d5fd0" opacity="0.55" />
      <path d="M20 24 q-3 14 2 22 l5 -3 q-4 -8 -2 -19 z" fill="#cdc8da" />
      <path d="M44 24 q3 14 -2 22 l-5 -3 q4 -8 2 -19 z" fill="#cdc8da" />
      <rect x="28" y="36" width="8" height="7" fill="#cfa87e" />
      <circle cx="32" cy="27" r="9.5" fill="#e6c9a4" />
      <path d="M22.5 24 h19 v4.5 h-19 z" fill="#ece6f4" />
      <path d="M22.5 28.5 h19 v0.9 h-19 z" fill="#b9aed6" />
      <path d="M41.5 24 l4 3 l-4 1.5 z" fill="#ece6f4" />
      <path d="M29.5 33.5 q2.5 1.2 5 0" stroke="#a87c50" stroke-width="0.9" fill="none" />
      <path d="M23 21 a9.5 7 0 0 1 18 0" stroke="#c9a227" stroke-width="1.4" fill="none" />
      <circle cx="32" cy="17.6" r="1.4" fill="#7d5fd0" />
    </g>

    <!-- fallback: unknown class -->
    <g v-else>
      <path d="M6 64 Q10 47 32 46 Q54 47 58 64 Z" fill="#211d33" />
      <circle cx="32" cy="27" r="10" fill="#171228" stroke="#c9a227" stroke-width="1" />
      <text x="32" y="32" text-anchor="middle" font-size="12" fill="#c9a227">?</text>
    </g>

    <!-- shared rim light + floor shadow -->
    <path d="M15 48 a22 22 0 0 1 9 -31" stroke="rgba(255,235,200,0.16)" stroke-width="2" fill="none" stroke-linecap="round" />
    <rect x="0" y="58" width="64" height="6" fill="rgba(5,3,12,0.35)" />
  </svg>
</template>
