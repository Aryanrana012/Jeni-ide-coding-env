// vite.config.ts
import { defineConfig } from "file:///C:/Users/ar270/Desktop/Desktop/jeni%20ide/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ar270/Desktop/Desktop/jeni%20ide/node_modules/@vitejs/plugin-react/dist/index.js";
import electron from "file:///C:/Users/ar270/Desktop/Desktop/jeni%20ide/node_modules/vite-plugin-electron/dist/index.mjs";
import renderer from "file:///C:/Users/ar270/Desktop/Desktop/jeni%20ide/node_modules/vite-plugin-electron-renderer/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\ar270\\Desktop\\Desktop\\jeni ide";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["node-pty"]
            }
          }
        }
      },
      {
        // Preload script entry point
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron"
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhcjI3MFxcXFxEZXNrdG9wXFxcXERlc2t0b3BcXFxcamVuaSBpZGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFyMjcwXFxcXERlc2t0b3BcXFxcRGVza3RvcFxcXFxqZW5pIGlkZVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYXIyNzAvRGVza3RvcC9EZXNrdG9wL2plbmklMjBpZGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZWxlY3Ryb24gZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24nO1xuaW1wb3J0IHJlbmRlcmVyIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uLXJlbmRlcmVyJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBlbGVjdHJvbihbXG4gICAgICB7XG4gICAgICAgIC8vIE1haW4gcHJvY2VzcyBlbnRyeSBwb2ludFxuICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL21haW4udHMnLFxuICAgICAgICB2aXRlOiB7XG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcjogJ2Rpc3QtZWxlY3Ryb24nLFxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgICBleHRlcm5hbDogWydub2RlLXB0eSddXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyBQcmVsb2FkIHNjcmlwdCBlbnRyeSBwb2ludFxuICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL3ByZWxvYWQudHMnLFxuICAgICAgICBvbnN0YXJ0KG9wdGlvbnMpIHtcbiAgICAgICAgICBvcHRpb25zLnJlbG9hZCgpO1xuICAgICAgICB9LFxuICAgICAgICB2aXRlOiB7XG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcjogJ2Rpc3QtZWxlY3Ryb24nXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgXSksXG4gICAgcmVuZGVyZXIoKVxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJylcbiAgICB9XG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzNcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFULFNBQVMsb0JBQW9CO0FBQ2xWLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFDckIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sVUFBVTtBQUpqQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUDtBQUFBO0FBQUEsUUFFRSxPQUFPO0FBQUEsUUFDUCxNQUFNO0FBQUEsVUFDSixPQUFPO0FBQUEsWUFDTCxRQUFRO0FBQUEsWUFDUixlQUFlO0FBQUEsY0FDYixVQUFVLENBQUMsVUFBVTtBQUFBLFlBQ3ZCO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBO0FBQUEsUUFFRSxPQUFPO0FBQUEsUUFDUCxRQUFRLFNBQVM7QUFDZixrQkFBUSxPQUFPO0FBQUEsUUFDakI7QUFBQSxRQUNBLE1BQU07QUFBQSxVQUNKLE9BQU87QUFBQSxZQUNMLFFBQVE7QUFBQSxVQUNWO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
