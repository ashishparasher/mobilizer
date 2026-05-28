module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF6B35", // Saffron orange
        dark: "#1A1A2E",    // Navy
        success: "#22C55E", // Green success
        background: "#F8FAFC"
      }
    }
  },
  plugins: []
}
