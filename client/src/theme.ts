import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#e7f3ff",
  "#d0e4ff",
  "#a3c8fb",
  "#73aaf5",
  "#4c90f0",
  "#337fee",
  "#2176ee",
  "#1465d4",
  "#0a59bf",
  "#004ca9",
];

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  defaultRadius: "md",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headings: { fontWeight: "600" },
  shadows: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.08)",
    md: "0 4px 12px rgba(0, 0, 0, 0.08)",
  },
  components: {
    Card: {
      defaultProps: { withBorder: true, radius: "lg", shadow: "sm" },
    },
    Paper: {
      defaultProps: { radius: "lg" },
    },
  },
});
