import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// brew install mkcert nss
// mkcert -install
// mkcert localhost 127.0.0.1
const httpsKeyFile = path.resolve(__dirname, "localhost+2-key.pem");
const httpsCertFile = path.resolve(__dirname, "localhost+2.pem");

// https://vitejs.dev/config/
const config = {
  // So the build can be served from an arbitrary path
  base: "./",

  server: {},

  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        hooks: "hooks.html",
      },
    },
  },

  plugins: [
    // https://github.com/vite-pwa/vite-plugin-pwa/blob/main/src/types.ts
    // https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Increase precache limit to e.g. 50 MB
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      manifest: {
        name: "Chess Openings - Jonathan Olson",
        short_name: "Chess Openings",
        description: "Learn chess openings interactively",
        theme_color: "#eeeeee",
        background_color: "#eeeeee",
        icons: [
          {
            src: "images/chess-openings-512px.png",
            type: "image/png",
            sizes: "512x512",
          },
          {
            src: "images/chess-openings-192px.png",
            type: "image/png",
            sizes: "192x192",
          },
        ],
      },
    }),
  ],
};

if (fs.existsSync(httpsKeyFile) && fs.existsSync(httpsCertFile)) {
  config.server.https = {
    key: fs.readFileSync(httpsKeyFile),
    cert: fs.readFileSync(httpsCertFile),
  };
}

export default defineConfig(config);
