const colors = require("tailwindcss/colors")

module.exports = {
  mode: "jit",
  purge: ["./js/**/*.js", "../lib/*_web/**/*.*ex"],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        default: colors.blueGray,
        brand: colors.violet,
        success: colors.lime,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.sky,
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
