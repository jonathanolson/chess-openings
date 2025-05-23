import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

// npx vite --host
// OR
// npm run build
// npx vite preview --host --port=5173

// brew install mkcert nss
// mkcert -install
// mkcert localhost 127.0.0.1
const httpsKeyFile = path.resolve(__dirname, "localhost+2-key.pem");
const httpsCertFile = path.resolve(__dirname, "localhost+2.pem");

// https://vitejs.dev/config/
const config = {
  // So the build can be served from an arbitrary path
  base: "./",

  server: {
    watch: {
      ignored: ["**src/data/lichess*.json", "**src/data/stockfish*.json"],
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        hooks: "hooks.html",
      },
    },
  },

  plugins: [
    {
      name: "log-imports",
      resolveId(source, importer) {
        console.log(`[resolve] ${importer} → ${source}`);
        return null; // let Vite continue resolving as usual
      },
      load(id) {
        console.log(`[load] ${id}`);
        return null; // let Vite load it normally
      },
    },
  ],
};

if (fs.existsSync(httpsKeyFile) && fs.existsSync(httpsCertFile)) {
  config.server.https = {
    key: fs.readFileSync(httpsKeyFile),
    cert: fs.readFileSync(httpsCertFile),
  };
}

export default defineConfig(config);
