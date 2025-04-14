// Imports
import { formatHex, okhsl, xyz65 } from 'culori';

// Variables
const scaleNumbers = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const maxScaleNumber = 1000;
const baseHue  = 250; // blue
const minChroma = 0;
const maxChroma  = 1;
const backgroundHex = '#FFFFFF';

// Functions
function YtoL(Y) {
  if (Y <= 0.0088564516) {
    return Y * 903.2962962;
  } else {
    return 116 * Math.pow(Y, 1 / 3) - 16;
  }
};

function toe(l) {
  const k_1 = 0.206;
  const k_2 = 0.03;
  const k_3 = (1 + k_1) / (1 + k_2);

  return (
    0.5 *
    (k_3 * l -
      k_1 +
      Math.sqrt((k_3 * l - k_1) * (k_3 * l - k_1) + 4 * k_2 * k_3 * l))
  );
};

function normalizeScaleNumber(scaleNumber, maxScaleNumber) {
  return scaleNumber / maxScaleNumber;
};

function computeScaleHue(scaleValue, baseHue) {
  return baseHue + 5 * (1 - scaleValue);
};

function computeScaleChroma(scaleValue, minChroma, maxChroma) {
  const chromaDifference = maxChroma - minChroma;

  return (
    -4 * chromaDifference * Math.pow(scaleValue, 2) +
    4 * chromaDifference * scaleValue +
    minChroma
  );
};

function computeScaleLightness(scaleValue, backgroundHex) {
  const backgroundXYZ = xyz65(backgroundHex);
  const contrastRatio = Math.log(20.25);
  // const contrastRatio = 3.04;

  let foregroundY;
  if (backgroundXYZ.y > 0.18) {
    foregroundY = (backgroundXYZ.y + 0.05) / Math.exp(contrastRatio * scaleValue) - 0.05;
  } else {
    foregroundY = Math.exp(contrastRatio * scaleValue) * (backgroundXYZ.y + 0.05) - 0.05;
  }

  return(toe(YtoL(foregroundY))/116.91);
};

function computeColorAtScaleNumber(
  scaleNumber,
  maxScaleNumber,
  baseHue,
  minChroma,
  maxChroma,
  backgroundHex
) {
  const okhslColor = {};
  const scaleValue = normalizeScaleNumber(scaleNumber, maxScaleNumber);
  okhslColor.h = computeScaleHue(scaleValue, baseHue);
  okhslColor.s = computeScaleChroma(scaleValue, minChroma, maxChroma);
  okhslColor.l = computeScaleLightness(scaleValue, backgroundHex);
  console.log(okhsl(okhslColor));
  return formatHex(okhsl(okhslColor));
};

for (const scaleNumber of scaleNumbers) {
  console.log(computeColorAtScaleNumber(scaleNumber, maxScaleNumber, baseHue, minChroma, maxChroma, backgroundHex));
}