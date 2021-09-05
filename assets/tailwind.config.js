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
    extend: {
      colors: {
        default: colors.blueGray,
        brand: colors.violet,
        success: colors.lime,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.sky,
      },
      fontFamily: {
        barrio: ["Barrio", ...defaultTheme.fontFamily.serif],
        mono: ["Fira Code", ...defaultTheme.fontFamily.mono],
        logo: ["PaletteMosaic", "cursive", ...defaultTheme.fontFamily.sans],
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
