import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as d3 from "d3";

export type ColorMode =
  | "default"
  | "colorblind-safe"
  | "colorblind-v1" // Orange-Purple
  | "colorblind-v2" // Purple-Green
  | "colorblind-v3"; // Brown-Teal

export interface ColorScheme {
  diverging: d3.ScaleDiverging<string, never>;
  sequential: d3.ScaleSequential<string, never>;
  name: string;
  description: string;
}

// Custom interpolators for accessible colors
const accessibleDivergingInterpolator = (t: number) => {
  // Define colors for diverging: pink to green with smooth gradient
  const colors = [
    "#d01c8b",
    "#f1b6da",
    "#f7f7f7",
    "#b8e186",
    "#4dac26",
    // "#de77ae",
    // "#f1b6da",
    // "#e6f5d0",
    // "#b8e186",
    // "#7fbc41",
  ];

  // Create a scale with multiple color stops
  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

const accessibleSequentialInterpolator = (t: number) => {
  // Sequential scale: light to dark green
  const colors = [
    "#f7fcf5",
    "#e5f5e0",
    "#c7e9c0",
    "#a1d99b",
    "#74c476",
    "#41ab5d",
    "#238b45",
    "#006d2c",
  ];

  // Create a scale with multiple color stops
  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

// Version 1: Orange-Purple palette
const v1DivergingInterpolator = (t: number) => {
  const colors = [
    "#e66101",
    "#fdb863",
    "#f7f7f7",
    "#b2abd2",
    "#5e3c99",
    // "#b35806",
    // "#e08214",
    // "#fdb863",
    // "#fee0b6",
    // "#f7f7f7",
    // "#d8daeb",
    // "#b2abd2",
    // "#8073ac",
    // "#542788",
  ];

  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

const v1SequentialInterpolator = (t: number) => {
  // Sequential scale using purple tones
  const colors = [
    "#fcfbfd",
    "#efedf5",
    "#dadaeb",
    "#bcbddc",
    "#9e9ac8",
    "#807dba",
    "#6a51a3",
    "#54278f",
  ];

  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

// Version 2: Purple-Green palette (alternative shades)
const v2DivergingInterpolator = (t: number) => {
  const colors = [
    "#7b3294",
    "#c2a5cf",
    "#f7f7f7",
    "#a6dba0",
    "#008837",
    // "#762a83",
    // "#9970ab",
    // "#c2a5cf",
    // "#e7d4e8",
    // "#f7f7f7",
    // "#d9f0d3",
    // "#a6dba0",
    // "#5aae61",
    // "#1b7837",
  ];

  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

const v2SequentialInterpolator = (t: number) => {
  // Sequential scale using green tones
  const colors = ["#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837"];

  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

// Version 3: Brown-Teal palette
const v3DivergingInterpolator = (t: number) => {
  const colors = ["#a6611a", "#dfc27d", "#f5f5f5", "#80cdc1", "#018571"];

  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

const v3SequentialInterpolator = (t: number) => {
  // Sequential scale using teal tones
  const colors = ["#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e"];

  const colorScale = d3
    .scaleLinear<string>()
    .domain(colors.map((_, i) => i / (colors.length - 1)))
    .range(colors)
    .interpolate(d3.interpolateRgb);

  return colorScale(t);
};

const colorSchemes: Record<ColorMode, ColorScheme> = {
  default: {
    diverging: d3.scaleDiverging(d3.interpolateRdYlGn),
    sequential: d3.scaleSequential(accessibleSequentialInterpolator),
    name: "Default",
    description: "Standard red-yellow-green scale for general use",
  },
  "colorblind-safe": {
    diverging: d3.scaleDiverging(accessibleDivergingInterpolator),
    sequential: d3.scaleSequential(accessibleSequentialInterpolator),
    name: "Pink-Green",
    description: "Pink-white-green scale optimized for accessibility",
  },
  "colorblind-v1": {
    diverging: d3.scaleDiverging(v1DivergingInterpolator),
    sequential: d3.scaleSequential(v1SequentialInterpolator),
    name: "Orange-Purple",
    description: "Warm orange to cool purple diverging scale",
  },
  "colorblind-v2": {
    diverging: d3.scaleDiverging(v2DivergingInterpolator),
    sequential: d3.scaleSequential(v2SequentialInterpolator),
    name: "Purple-Green Alt",
    description: "Alternative purple-green with softer tones",
  },
  "colorblind-v3": {
    diverging: d3.scaleDiverging(v3DivergingInterpolator),
    sequential: d3.scaleSequential(v3SequentialInterpolator),
    name: "Brown-Teal",
    description: "Earth-tone brown to ocean teal scale",
  },
};

interface ColorSettingsState {
  colorMode: ColorMode;
  customColors?: {
    divergingStart?: string;
    divergingMid?: string;
    divergingEnd?: string;
    sequentialStart?: string;
    sequentialEnd?: string;
  };

  setColorMode: (mode: ColorMode) => void;
  setCustomColors: (colors: ColorSettingsState["customColors"]) => void;
  getColorScheme: () => ColorScheme;
  reset: () => void;
}

export const useColorSettingsStore = create<ColorSettingsState>()(
  persist(
    (set, get) => ({
      colorMode: "colorblind-safe",
      customColors: undefined,

      setColorMode: (mode: ColorMode) => {
        set({ colorMode: mode });
      },

      setCustomColors: (colors) => {
        set({ customColors: colors });
      },

      getColorScheme: () => {
        const { colorMode } = get();
        return colorSchemes[colorMode];
      },

      reset: () => {
        set({
          colorMode: "colorblind-safe",
          customColors: undefined,
        });
      },
    }),
    {
      name: "color-settings-storage",
      partialize: (state) => ({
        colorMode: state.colorMode,
        customColors: state.customColors,
      }),
    }
  )
);

export { colorSchemes };
