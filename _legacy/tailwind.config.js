module.exports = {
  purge: ["./**/*.{css,html,js}"],
  darkMode: "media", // or 'media' or 'class'
  mode: "jit",
  theme: {
    extend: {
      container: {
        center: true,
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
