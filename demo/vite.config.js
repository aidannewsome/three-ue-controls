import { defineConfig } from 'vite';

// GitHub Pages serves the demo from /three-ue-controls/, not from the root.
export default defineConfig( ( { command } ) => ( {
	base: command === 'build' ? '/three-ue-controls/' : '/',
	build: { outDir: 'dist', emptyOutDir: true },
} ) );
