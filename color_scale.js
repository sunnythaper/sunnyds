// Imports

import { formatHex, wcagContrast, rgb, xyz65, parse } from 'culori';

// Variables

const scaleNumbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000];
const maxScaleNumber = 1000;
const baseHue = 250;
const minChroma = 0.15;
const maxChroma = 0.85;
const neutralScale = true;
const backgroundHex = '#FFFFFF';
const contrastTargetMultiplier = Math.log(20.25) + 0.01155; // Added extra contrast to the multiplier to help achieve full-spectrum AA compliance
const searchTolerance = 0.001;
const maxSearchIterations = 30;

// Functions

function normalizeScaleNumber(scaleNumber, maxScaleNumber) {
  return scaleNumber / maxScaleNumber;
}

function computeScaleHue(scaleValue, baseHue, neutralScale) {
  if (neutralScale == true) {
    return baseHue;
  } else {
    return baseHue + 5 * (1 - scaleValue);
  }
}

function computeScaleChroma(scaleValue, minChroma, maxChroma) {
  const chromaDifference = maxChroma - minChroma;

  let chromaMuliplier;

  if (neutralScale == true) {
    chromaMuliplier = 0.8;
  } else {
    chromaMuliplier = 4
  }

  return (
    -chromaMuliplier * chromaDifference * Math.pow(scaleValue, 2) +
    chromaMuliplier * chromaDifference * scaleValue +
    minChroma
  );
}

function getActualContrast(okhslColor, backgroundHex) {
    const clampedOkhsl = {
        ...okhslColor,
        l: Math.max(0, Math.min(1, okhslColor.l ?? 0)),
        mode: 'okhsl'
    };

    try {
        const rgbColor = rgb(clampedOkhsl);
        if (!rgbColor) return 1;

        const foregroundHex = formatHex(rgbColor);
        if (!foregroundHex) return 1;

        const contrast = wcagContrast(foregroundHex, backgroundHex);
        return contrast || 1;

    } catch (error) {
        return 1;
    }
}

function findOptimalOkL(targetHue, targetSat, targetContrast, backgroundHex, backgroundY) {
  let lowL = 0;
  let highL = 1;
  let optimalL = backgroundY > 0.18 ? 0 : 1;
  let iterations = 0;

  const isLightBackground = backgroundY > 0.18;

  if (targetContrast <= 1.01) {
      const bgLstar = YtoL(backgroundY);
      return Lstar_to_OKL(bgLstar);
  }


  while (highL - lowL > searchTolerance && iterations < maxSearchIterations) {
    iterations++;
    const midL = (lowL + highL) / 2;

    const currentContrast = getActualContrast(
      { h: targetHue, s: targetSat, l: midL },
      backgroundHex
    );

    if (currentContrast < targetContrast) {
      if (isLightBackground) {
        highL = midL;
      } else {
        lowL = midL;
      }
    } else {
      optimalL = midL;
      if (isLightBackground) {
        lowL = midL;
      } else {
        highL = midL;
      }
    }
  }

  let finalL = optimalL;

  if (isLightBackground) {
      if (getActualContrast({ h: targetHue, s: targetSat, l: lowL }, backgroundHex) >= targetContrast) {
          finalL = lowL;
      } else if (getActualContrast({ h: targetHue, s: targetSat, l: highL }, backgroundHex) >= targetContrast) {
          finalL = highL;
      }
  } else {
      if (getActualContrast({ h: targetHue, s: targetSat, l: highL }, backgroundHex) >= targetContrast) {
          finalL = highL;
      } else if (getActualContrast({ h: targetHue, s: targetSat, l: lowL }, backgroundHex) >= targetContrast) {
          finalL = lowL;
      }
  }

  return Math.max(0, Math.min(1, finalL));
}

function YtoL(Y) {
  Y = Math.max(0, Math.min(1, Y));
  const Y_epsilon = 0.0088564516;
  const k = 903.2962962;
  if (Y <= Y_epsilon) { return Y * k; }
  else { return 116 * Math.pow(Y, 1/3) - 16; }
}

function Lstar_to_OKL(Lstar) {
  if (Lstar <= 0) return 0;
  if (Lstar >= 100) return 1;
  const k1 = 0.206;
  const k2 = 0.03;
  const k3 = (1 + k1) / (1 + k2);
  const L_t = Lstar / 100.0;
  const ok_L = (L_t * (L_t + k1)) / (k3 * (L_t + k2));
  return Math.max(0, Math.min(1, ok_L));
};

function computeColorAtScaleNumberIterative(
  scaleNumber,
  maxScaleNumber,
  baseHue,
  minChroma,
  maxChroma,
  backgroundHex
) {
  const scaleValue = normalizeScaleNumber(scaleNumber, maxScaleNumber);
  const targetHue = computeScaleHue(scaleValue, baseHue, neutralScale);
  const targetSat = computeScaleChroma(scaleValue, minChroma, maxChroma);
  const targetContrast = scaleValue <= 0 ? 1 : Math.exp(contrastTargetMultiplier * scaleValue);
  const backgroundParsed = parse(backgroundHex);
  const backgroundXYZ = backgroundParsed ? xyz65(backgroundParsed) : { y: 1 }; // Default to white if parse fails
  const backgroundY = backgroundXYZ ? backgroundXYZ.y : 1;
  const optimalLightness = findOptimalOkL(
    targetHue,
    targetSat,
    targetContrast,
    backgroundHex,
    backgroundY
  );

  const finalOkhslColor = {
    mode: 'okhsl',
    h: targetHue,
    s: targetSat,
    l: optimalLightness,
  };

  try {
    return formatHex(finalOkhslColor);
  } catch (error) {
    return '#FFFFFF';
  }
}

console.log(`Generating scale for Hue ${baseHue} against ${backgroundHex}`);
console.log("Scale #: Target Contrast -> Actual Contrast -> Hex Color");
console.log("------------------------------------------------------");

const generatedScale = {};

for (const scaleNumber of scaleNumbers) {
  const scaleValue = normalizeScaleNumber(scaleNumber, maxScaleNumber);
  const targetContrast = scaleValue <= 0 ? 1 : Math.exp(contrastTargetMultiplier * scaleValue);

  const hexColor = computeColorAtScaleNumberIterative(
    scaleNumber,
    maxScaleNumber,
    baseHue,
    minChroma,
    maxChroma,
    backgroundHex
  );
  generatedScale[scaleNumber] = hexColor;

  const actualContrast = wcagContrast(hexColor, backgroundHex) || 1;

  console.log(
      `${scaleNumber}:`.padEnd(9),
      `${targetContrast.toFixed(2)} -> `.padEnd(10),
      `${actualContrast.toFixed(2)} -> `.padEnd(10),
      `${hexColor}`
  );

  if (scaleNumber === 500) {
      const compliant = actualContrast >= 4.5;
      console.log(`--- AA Check (500 vs Background): ${compliant ? 'PASS' : 'FAIL'} (Contrast: ${actualContrast.toFixed(2)}) ---`);
  }
}

if (generatedScale[600] && generatedScale[100]) {
  const contrast600vs100 = wcagContrast(generatedScale[600], generatedScale[100]) || 1;
  const compliant = contrast600vs100 >= 4.5;
  console.log(`--- AA Check (600 vs 100): ${compliant ? 'PASS' : 'FAIL'} (Contrast: ${contrast600vs100.toFixed(2)}) ---`);
}

if (generatedScale[700] && generatedScale[200]) {
  const contrast700vs200 = wcagContrast(generatedScale[700], generatedScale[200]) || 1;
  const compliant = contrast700vs200 >= 4.5;
  console.log(`--- AA Check (700 vs 200): ${compliant ? 'PASS' : 'FAIL'} (Contrast: ${contrast700vs200.toFixed(2)}) ---`);
}

if (generatedScale[800] && generatedScale[300]) {
  const contrast800vs300 = wcagContrast(generatedScale[800], generatedScale[300]) || 1;
  const compliant = contrast800vs300 >= 4.5;
  console.log(`--- AA Check (800 vs 300): ${compliant ? 'PASS' : 'FAIL'} (Contrast: ${contrast800vs300.toFixed(2)}) ---`);
}

if (generatedScale[900] && generatedScale[400]) {
  const contrast900vs400 = wcagContrast(generatedScale[900], generatedScale[400]) || 1;
  const compliant = contrast900vs400 >= 4.5;
  console.log(`--- AA Check (900 vs 400): ${compliant ? 'PASS' : 'FAIL'} (Contrast: ${contrast900vs400.toFixed(2)}) ---`);
}

if (generatedScale[1000] && generatedScale[500]) {
  const contrast1000vs500 = wcagContrast(generatedScale[1000], generatedScale[500]) || 1;
  const compliant = contrast1000vs500 >= 4.5;
  console.log(`--- AA Check (1000 vs 500): ${compliant ? 'PASS' : 'FAIL'} (Contrast: ${contrast1000vs500.toFixed(2)}) ---`);
}