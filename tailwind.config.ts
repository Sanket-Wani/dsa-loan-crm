import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 50:"#eef6ff",100:"#d9eaff",600:"#1d6fd1",700:"#1859ab",900:"#0f2f57" } } } },
  plugins: [],
};
export default config;
