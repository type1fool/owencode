const colors = require("tailwindcss/colors")
const defaultTheme = require("tailwindcss/defaultTheme")

module.exports = {
  mode: "jit",
  purge: ["./js/**/*.js", "../lib/*_web/**/*.*ex"],
  darkMode: 'off', // or 'media' or 'class'
  theme: {
    container: {
      center: true,
    },
    colors: colors,
    extend: {
      colors: {
        default: colors.blueGray,
        brand: colors.lime,
        success: colors.lime,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.sky,
      },
      fontFamily: {
        sans: ["Kufam", ...defaultTheme.fontFamily.sans],
        barrio: ["Barrio", ...defaultTheme.fontFamily.serif],
        mono: ["FiraCode", ...defaultTheme.fontFamily.mono],
        logo: ["PaletteMosaic", "cursive", ...defaultTheme.fontFamily.sans],
        hand: ["BadScript", "cursive", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/line-clamp"),
  ],
}
