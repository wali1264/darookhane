import React from 'react';

// CODE 128 is a more modern, compact, and reliable barcode standard than Code 39.
// It's the standard choice for internal logistics and inventory management.
// This implementation uses Code Set B, which is suitable for ASCII characters.

const CODE128_CHARS: { [key: string]: { value: number; pattern: string } } = {
  ' ': { value: 0, pattern: '212222' }, '!': { value: 1, pattern: '222122' }, '"': { value: 2, pattern: '222221' }, '#': { value: 3, pattern: '121223' },
  '$': { value: 4, pattern: '121322' }, '%': { value: 5, pattern: '131222' }, '&': { value: 6, pattern: '122213' }, "'": { value: 7, pattern: '122312' },
  '(': { value: 8, pattern: '132212' }, ')': { value: 9, pattern: '221213' }, '*': { value: 10, pattern: '221312' }, '+': { value: 11, pattern: '231212' },
  ',': { value: 12, pattern: '112232' }, '-': { value: 13, pattern: '122132' }, '.': { value: 14, pattern: '122231' }, '/': { value: 15, pattern: '113222' },
  '0': { value: 16, pattern: '123122' }, '1': { value: 17, pattern: '123221' }, '2': { value: 18, pattern: '223211' }, '3': { value: 19, pattern: '221132' },
  '4': { value: 20, pattern: '221231' }, '5': { value: 21, pattern: '213212' }, '6': { value: 22, pattern: '223112' }, '7': { value: 23, pattern: '312131' },
  '8': { value: 24, pattern: '311222' }, '9': { value: 25, pattern: '321122' }, ':': { value: 26, pattern: '321221' }, ';': { value: 27, pattern: '312212' },
  '<': { value: 28, pattern: '322112' }, '=': { value: 29, pattern: '322211' }, '>': { value: 30, pattern: '212123' }, '?': { value: 31, pattern: '212321' },
  '@': { value: 32, pattern: '232121' }, 'A': { value: 33, pattern: '111323' }, 'B': { value: 34, pattern: '131123' }, 'C': { value: 35, pattern: '131321' },
  'D': { value: 36, pattern: '112313' }, 'E': { value: 37, pattern: '132113' }, 'F': { value: 38, pattern: '132311' }, 'G': { value: 39, pattern: '211313' },
  'H': { value: 40, pattern: '231113' }, 'I': { value: 41, pattern: '231311' }, 'J': { value: 42, pattern: '112133' }, 'K': { value: 43, pattern: '112331' },
  'L': { value: 44, pattern: '132131' }, 'M': { value: 45, pattern: '113123' }, 'N': { value: 46, pattern: '113321' }, 'O': { value: 47, pattern: '133121' },
  'P': { value: 48, pattern: '313121' }, 'Q': { value: 49, pattern: '211331' }, 'R': { value: 50, pattern: '231131' }, 'S': { value: 51, pattern: '213113' },
  'T': { value: 52, pattern: '213311' }, 'U': { value: 53, pattern: '213131' }, 'V': { value: 54, pattern: '311123' }, 'W': { value: 55, pattern: '311321' },
  'X': { value: 56, pattern: '331121' }, 'Y': { value: 57, pattern: '312113' }, 'Z': { value: 58, pattern: '312311' }, '[': { value: 59, pattern: '332111' },
  '\\': { value: 60, pattern: '314111' }, ']': { value: 61, pattern: '221411' }, '^': { value: 62, pattern: '431111' }, '_': { value: 63, pattern: '111224' },
  '`': { value: 64, pattern: '111422' }, 'a': { value: 65, pattern: '121124' }, 'b': { value: 66, pattern: '121421' }, 'c': { value: 67, pattern: '141122' },
  'd': { value: 68, pattern: '141221' }, 'e': { value: 69, pattern: '112214' }, 'f': { value: 70, pattern: '112412' }, 'g': { value: 71, pattern: '122114' },
  'h': { value: 72, pattern: '122411' }, 'i': { value: 73, pattern: '142112' }, 'j': { value: 74, pattern: '142211' }, 'k': { value: 75, pattern: '241211' },
  'l': { value: 76, pattern: '221114' }, 'm': { value: 77, pattern: '413111' }, 'n': { value: 78, pattern: '241112' }, 'o': { value: 79, pattern: '134111' },
  'p': { value: 80, pattern: '111242' }, 'q': { value: 81, pattern: '121142' }, 'r': { value: 82, pattern: '121241' }, 's': { value: 83, pattern: '114212' },
  't': { value: 84, pattern: '124112' }, 'u': { value: 85, pattern: '124211' }, 'v': { value: 86, pattern: '411212' }, 'w': { value: 87, pattern: '421112' },
  'x': { value: 88, pattern: '421211' }, 'y': { value: 89, pattern: '212141' }, 'z': { value: 90, pattern: '214121' }, '{': { value: 91, pattern: '412121' },
  '|': { value: 92, pattern: '111143' }, '}': { value: 93, pattern: '111341' }, '~': { value: 94, pattern: '131141' },
  // Special characters
  'START_B': { value: 104, pattern: '211214' },
  'STOP': { value: 106, pattern: '2331112' }, // Stop is unique
};
// Reverse mapping to find character from value for checksum
const VALUE_TO_CHAR = Object.entries(CODE128_CHARS).reduce((acc, [char, { value }]) => {
    if (char !== 'START_B' && char !== 'STOP') {
        acc[value] = char;
    }
    return acc;
}, {} as { [key: number]: string });

interface BarcodeSVGProps {
  value: string;
}

const BarcodeSVG: React.FC<BarcodeSVGProps> = ({ value }) => {
  if (!value) return null;

  const validChars = Object.keys(CODE128_CHARS);
  const filteredValue = value.split('').filter(char => validChars.includes(char)).join('');

  if (filteredValue.length === 0) return null;

  // 1. Calculate Checksum
  const startCodeValue = CODE128_CHARS['START_B'].value;
  let checksumWeightSum = startCodeValue;
  for (let i = 0; i < filteredValue.length; i++) {
    const char = filteredValue[i];
    const charValue = CODE128_CHARS[char]?.value;
    if (charValue === undefined) continue;
    checksumWeightSum += charValue * (i + 1);
  }
  const checksumValue = checksumWeightSum % 103;
  const checksumChar = VALUE_TO_CHAR[checksumValue];
  const checksumPattern = CODE128_CHARS[checksumChar]?.pattern;
  
  // 2. Build the full sequence of patterns
  const patterns = [
    CODE128_CHARS['START_B'].pattern,
    ...filteredValue.split('').map(char => CODE128_CHARS[char].pattern),
    checksumPattern,
    CODE128_CHARS['STOP'].pattern,
  ];

  // 3. Generate SVG bars from patterns
  let totalWidth = 0;
  const bars: { x: number; width: number }[] = [];
  let currentX = 0;

  for (const pattern of patterns) {
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const isBar = i % 2 === 0;
      const width = parseInt(pattern[i]);

      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
    }
  }
  totalWidth = currentX;

  // 4. Define SVG dimensions
  const height = 50;
  const quietZone = 10; // Standard requirement for Code 128 is 10x narrow bar width.
  const textHeight = 15;
  const totalSvgWidth = totalWidth + (quietZone * 2);
  const totalSvgHeight = height + textHeight;

  return (
    // CRITICAL FIX: The `preserveAspectRatio` is set to `xMidYMid meet`. This ensures the barcode
    // scales proportionally to fit its container, never distorting the bar widths, which is
    // essential for scanner readability. The previous value "none" was the root cause of the problem.
    <svg 
      viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`} 
      preserveAspectRatio="xMidYMid meet" 
      style={{ height: '100%', width: '100%', maxWidth: '100%' }} 
      aria-label={`Barcode for value ${value}`}
    >
      <rect x={0} y={0} width={totalSvgWidth} height={totalSvgHeight} fill="white" />
      {bars.map((bar, index) => (
        <rect key={index} x={bar.x + quietZone} y="0" width={bar.width} height={height} fill="black" />
      ))}
      {/* Add human-readable text below the barcode */}
      <text
        x={totalSvgWidth / 2}
        y={height + (textHeight / 1.5)}
        fontFamily="monospace"
        textAnchor="middle"
        fontSize="12"
        fill="black"
      >
        {value}
      </text>
    </svg>
  );
};

export default BarcodeSVG;