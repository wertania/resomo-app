<template>
  <div class="owl-container" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2048 2048"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      class="owl-svg"
    >
      <!-- Main body/head -->
      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 432.661 446.422 C 442.32 445.371 452.655 445.684 462.375 445.76 C 514 445.766 565.091 456.211 612.577 476.467 C 707.368 517.673 774.394 592.461 811.758 688.069 C 848.675 784.321 846.628 891.171 806.053 985.939 C 828.543 958.352 854.63 932.109 887.003 916.276 C 910.828 904.623 936.992 900.129 962.5 908.931 C 990.779 918.69 1010.73 940.271 1023.73 966.518 C 1030.94 951.286 1039.91 937.55 1052.94 926.646 C 1071.5 911.119 1095.36 902.277 1119.67 904.594 C 1167.96 909.198 1208.96 949.942 1238.25 985.697 C 1230.73 968.67 1224.55 951.079 1219.78 933.087 C 1193.2 829.61 1208.79 719.815 1263.14 627.832 C 1312.9 542.376 1390.26 484.122 1485.87 458.94 C 1585.85 432.522 1692.22 446.576 1781.91 498.055 C 1870.12 549.185 1934.52 633.12 1961.07 731.55 C 1987.61 831.971 1973.37 938.812 1921.46 1028.78 C 1866.68 1121.65 1783.05 1177.95 1679.76 1204.65 C 1635.82 1214.89 1590.47 1217.71 1545.6 1212.99 C 1446.91 1201.86 1356.43 1152.77 1293.29 1076.11 C 1301.36 1106.08 1293.7 1120.17 1291.56 1148.24 C 1290.59 1161.01 1291.08 1173.89 1290.14 1186.69 C 1288.13 1213.96 1283.03 1240.56 1276.83 1267.16 C 1256.58 1354.07 1205.21 1429.18 1141.01 1489.75 C 1121.86 1507.81 1100.81 1523.77 1081.36 1541.49 C 1065.72 1555.74 1041.47 1585.58 1025.7 1595.38 C 1012.11 1585.78 993.64 1562.4 979.224 1549.15 C 961.974 1533.29 943.22 1519.13 925.442 1503.88 C 886.313 1470.31 850.429 1432.81 822.266 1389.47 C 785.275 1332.54 765.126 1267.64 758.367 1200.31 C 757.349 1190.3 756.732 1180.25 756.518 1170.2 C 756.436 1163.47 757.302 1155.59 756.344 1149.01 C 755.548 1143.54 753.037 1138.17 751.895 1132.72 C 747.841 1113.36 747.855 1094.5 751.95 1075.19 C 751.343 1075.93 750.73 1076.67 750.11 1077.4 C 682.731 1156.16 586.996 1205.15 483.703 1213.73 C 380.91 1222.22 278.95 1189.56 200.23 1122.91 C 125.352 1058.18 78.8748 966.642 70.7955 867.994 C 61.5684 762.355 95.6186 657.495 165.148 577.43 C 233.78 496.878 328.364 454.844 432.661 446.422 z"
      />

      <!-- Left eye outer (yellow) -->
      <path
        transform="translate(0,0)"
        fill="rgb(250,202,54)"
        d="M 446.454 493.834 C 632.302 489.448 786.53 636.525 790.966 822.371 C 795.402 1008.22 648.367 1162.49 462.522 1166.97 C 276.606 1171.46 122.266 1024.36 117.828 838.439 C 113.39 652.521 260.536 498.221 446.454 493.834 z"
        :class="['left-eye-outer', { 'eye-closed': !eyesOpen }]"
      />

      <!-- Left eye inner (black pupil) -->
      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 485.286 592.778 C 612.575 588.678 719.104 688.509 723.266 815.797 C 727.429 943.084 627.651 1049.66 500.365 1053.89 C 372.991 1058.12 266.322 958.253 262.157 830.876 C 257.991 703.5 357.907 596.88 485.286 592.778 z"
        :class="['left-eye-inner', { 'eye-closed': !eyesOpen }]"
      />

      <!-- Left eye highlight -->
      <path
        transform="translate(0,0)"
        fill="rgb(232,226,209)"
        d="M 555.954 693.249 C 574.231 689.99 592.845 696.836 604.655 711.161 C 616.465 725.486 619.636 745.064 612.951 762.384 C 606.267 779.704 590.765 792.076 572.394 794.753 C 544.608 798.801 518.712 779.81 514.223 752.091 C 509.733 724.373 528.31 698.179 555.954 693.249 z"
        :class="['left-eye-highlight', { 'eye-closed': !eyesOpen }]"
      />

      <!-- Right eye outer (yellow) -->
      <path
        transform="translate(0,0)"
        fill="rgb(250,202,54)"
        d="M 1563.92 495.74 C 1748.93 481.415 1910.56 619.676 1925.08 804.669 C 1939.59 989.661 1801.5 1151.44 1616.52 1166.14 C 1431.27 1180.87 1269.21 1042.53 1254.68 857.267 C 1240.14 672.007 1378.65 510.086 1563.92 495.74 z"
        :class="['right-eye-outer', { 'eye-closed': !eyesOpen }]"
      />

      <!-- Right eye inner (black pupil) -->
      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 1536.6 589.406 C 1536.86 589.358 1537.13 589.293 1537.4 589.262 C 1588.55 583.456 1648.34 602.137 1688 634.582 C 1736.33 674.115 1771.54 737.778 1777.25 800.125 C 1783.11 864.096 1765.66 928.353 1723.88 977.871 C 1684.85 1023.98 1628.99 1052.56 1568.76 1057.25 C 1568.42 1057.29 1568.09 1057.34 1567.75 1057.37 C 1508.99 1063.29 1452.93 1043.62 1407.56 1006.87 C 1361.29 968.689 1332.18 913.625 1326.66 853.892 C 1319.87 787.146 1338.43 722.06 1381.05 670.035 C 1419.89 622.622 1476.03 595.367 1536.6 589.406 z"
        :class="['right-eye-inner', { 'eye-closed': !eyesOpen }]"
      />

      <!-- Right eye highlight -->
      <path
        transform="translate(0,0)"
        fill="rgb(232,226,209)"
        d="M 1456.56 693.096 C 1484.72 688.462 1511.26 707.672 1515.66 735.872 C 1520.05 764.071 1500.62 790.448 1472.39 794.606 C 1444.49 798.715 1418.49 779.563 1414.14 751.697 C 1409.8 723.832 1428.73 697.675 1456.56 693.096 z"
        :class="['right-eye-highlight', { 'eye-closed': !eyesOpen }]"
      />

      <!-- Upper Beak (orange - stays static) -->
      <path
        transform="translate(0,0)"
        fill="rgb(243,159,33)"
        d="M 1023.36 1053.74 C 1043.59 1037.14 1056.8 994.289 1078.92 972.752 C 1089.47 962.482 1103.14 956.373 1118.02 956.778 C 1146 957.539 1173.5 981.954 1191.53 1001.14 C 1218.62 1029.98 1249.31 1070.09 1247.86 1111.58 C 1247.52 1121.61 1245.5 1131.29 1240.81 1140.22 C 1223.31 1173.53 1153.65 1237.5 1123.74 1265.22 C 1090.17 1296.5 1055.08 1326.35 1022.54 1358.71 C 972.55 1310.23 919.761 1264.78 870.318 1215.67 C 850.937 1196.42 830.065 1177.01 813.744 1155.02 C 806.785 1145.65 800.591 1134.99 797.886 1123.53 C 791.703 1097.33 802.887 1069.79 816.472 1047.85 C 839.577 1010.53 877.933 967.531 922.257 957.153 C 922.86 957.104 923.462 957.041 924.066 957.005 C 985.275 953.336 988.694 1023.82 1023.36 1053.74 z"
        class="upper-beak"
      />

      <!-- Right nostril (black) -->
      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 1129.49 1033.14 C 1132.31 1032.97 1135.23 1033.09 1138.01 1033.65 C 1145.93 1035.25 1152.77 1039.9 1156.91 1046.86 C 1161.37 1054.36 1162.01 1063.49 1159.8 1071.83 C 1155.08 1089.56 1136.97 1103.69 1121.61 1112.32 C 1114.6 1114.76 1104.4 1117.34 1097.26 1114.05 C 1094.75 1112.89 1093.09 1111.22 1092.24 1108.55 C 1088.68 1097.32 1102.17 1060.26 1107.74 1049.52 C 1112.35 1040.61 1120.28 1036.24 1129.49 1033.14 z"
        class="right-nostril"
      />

      <!-- Left nostril (black) -->
      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 907.89 1032.16 C 915.824 1032.26 922.442 1035.09 928.116 1040.67 C 938.907 1051.27 951.949 1090.21 951.521 1105.48 C 951.456 1107.81 951.059 1111.21 949.1 1112.75 C 943.952 1116.79 934.658 1115.09 928.582 1114.24 C 924.646 1113.05 921.049 1111.55 917.498 1109.45 C 902.959 1100.87 887.089 1086 883.092 1069.12 C 881.217 1061.2 881.446 1052.2 886.105 1045.24 C 891.152 1037.7 899.309 1034 907.89 1032.16 z"
        class="left-nostril"
      />

      <!-- Lower Beak/Body (moves up when mouth opens) -->
      <path
        transform="translate(0,0)"
        fill="rgb(226,106,19)"
        d="M 805.778 1209.59 C 812.105 1213.64 818.511 1222.43 823.785 1227.94 C 834.678 1239.28 845.708 1250.49 856.873 1261.57 C 890.651 1294.31 925.02 1326.43 959.962 1357.92 C 979.567 1375.72 998.913 1395.17 1020.35 1410.67 C 1040.02 1402.75 1069.19 1373.33 1085.55 1358.5 C 1114.36 1332.38 1143.6 1306.58 1171.51 1279.49 C 1194.94 1256.76 1217.14 1232.76 1240.95 1210.42 C 1234.95 1247.64 1230.21 1268.5 1216.5 1304.25 C 1192.81 1368.69 1149.56 1421.33 1098.32 1466.04 C 1074.17 1487.11 1048.66 1506.91 1025.73 1529.32 C 1008.32 1510.37 987.486 1494.86 967.62 1478.66 C 879.168 1406.54 817.719 1326.55 805.778 1209.59 z"
        :class="['lower-beak', { 'mouth-open': mouthOpen }]"
      />

      <!-- Eyebrows/ears -->
      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 1629.51 272.427 C 1664.03 271.221 1700.52 277.182 1733.45 287.435 C 1784.36 303.289 1852.75 339.915 1878.27 389.349 C 1883.3 399.104 1888.52 413.044 1884.63 423.867 C 1883.33 427.483 1880.67 430.346 1877.07 431.767 C 1872.99 433.38 1868.93 432.686 1864.95 431.149 C 1850.16 425.439 1836.74 414.417 1823.27 406.095 C 1809.62 397.658 1795.19 390.849 1780.48 384.5 C 1721.38 357.773 1643.86 348.323 1580.19 359.621 C 1559.52 363.287 1533.69 373.307 1515.2 375.133 C 1509.52 375.694 1504.45 374.826 1500.01 370.968 C 1496.33 367.775 1494.67 363.228 1494.28 358.474 C 1493 342.607 1503.83 327.134 1513.96 315.92 C 1543.05 283.74 1588.07 274.641 1629.51 272.427 z"
      />

      <path
        transform="translate(0,0)"
        fill="rgb(10,9,5)"
        d="M 388.848 272.418 C 423.231 270.826 456.91 273.241 488.821 287.12 C 513.301 297.766 540.784 316.288 550.571 342.378 C 553.196 349.377 554.703 358.59 551.223 365.581 C 545.865 376.344 535.174 375.58 525.154 373.515 C 510.374 370.468 496.168 364.847 481.272 361.797 C 416.231 348.48 355.25 353.827 292.052 372.527 C 275.004 378.178 258.394 385.076 242.358 393.165 C 233.606 397.639 224.825 402.24 216.39 407.289 C 204.762 414.249 190.686 426.661 177.107 428.73 C 173.219 429.322 168.919 428.783 165.785 426.238 C 162.468 423.545 161.386 419.479 160.98 415.394 C 159.283 398.321 171.489 379.65 181.998 367.158 C 232.973 306.56 312.081 278.878 388.848 272.418 z"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
interface Props {
  autoBlinking?: boolean
  blinkInterval?: number
  mouthAnimated?: boolean
  mouthInterval?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoBlinking: true,
  blinkInterval: 3000,
  mouthAnimated: false,
  mouthInterval: 2000,
  size: 200,
})

const eyesOpen = ref(true)
const mouthOpen = ref(false)
const blinkTimer = ref<number | null>(null)
const mouthTimer = ref<number | null>(null)

function blink() {
  eyesOpen.value = false
  setTimeout(() => {
    eyesOpen.value = true
  }, 150)
}

function toggleMouth() {
  mouthOpen.value = !mouthOpen.value
}

function startBlinking() {
  if (blinkTimer.value) clearInterval(blinkTimer.value)
  blinkTimer.value = setInterval(() => {
    blink()
  }, props.blinkInterval) as any
}

function startMouthAnimation() {
  if (mouthTimer.value) clearInterval(mouthTimer.value)
  mouthTimer.value = setInterval(() => {
    mouthOpen.value = !mouthOpen.value
  }, props.mouthInterval) as any
}

watch(
  () => props.autoBlinking,
  (newVal) => {
    if (newVal) {
      startBlinking()
    } else if (blinkTimer.value) {
      clearInterval(blinkTimer.value)
      blinkTimer.value = null
    }
  },
  { immediate: true },
)

watch(
  () => props.mouthAnimated,
  (newVal) => {
    if (newVal) {
      startMouthAnimation()
    } else if (mouthTimer.value) {
      clearInterval(mouthTimer.value)
      mouthTimer.value = null
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.autoBlinking) {
    startBlinking()
  }
  if (props.mouthAnimated) {
    startMouthAnimation()
  }
})

onUnmounted(() => {
  if (blinkTimer.value) clearInterval(blinkTimer.value)
  if (mouthTimer.value) clearInterval(mouthTimer.value)
})

defineExpose({
  blink,
  toggleMouth,
})
</script>

<style scoped>
.owl-container {
  display: inline-block;
  position: relative;
}

.owl-svg {
  transition: all 0.3s ease;
}

/* Eye blinking animation */
.left-eye-outer,
.left-eye-inner,
.left-eye-highlight,
.right-eye-outer,
.right-eye-inner,
.right-eye-highlight {
  transition: transform 0.15s ease-in-out;
  transform-origin: center;
}

.eye-closed {
  transform: scaleY(0.1);
}

/* Mouth animation - upper beak stays static, lower beak moves up */
.upper-beak {
  /* No animation - stays static */
}

.lower-beak {
  transition: transform 0.4s ease-in-out;
  transform-origin: center top;
}

.lower-beak.mouth-open {
  /* Move further and scale slightly for a more pronounced opening */
  transform: translateY(-80px) scale(1.15);
}

/* Nostrils stay static */
.right-nostril,
.left-nostril {
  transition: none;
}

/* Hover effects */
.owl-container:hover .owl-svg {
  transform: scale(1.02);
}
</style>

