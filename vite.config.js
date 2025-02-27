import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

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
};

if (fs.existsSync(httpsKeyFile) && fs.existsSync(httpsCertFile)) {
  config.server.https = {
    key: fs.readFileSync(httpsKeyFile),
    cert: fs.readFileSync(httpsCertFile),
  };
}

export default defineConfig(config);
