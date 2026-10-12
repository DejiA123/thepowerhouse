# Technical decisions

- Vite `build.target` must be the single string `'es2020'`, never a multi-engine list like `['es2020', 'safari14']`: esbuild 0.27.2's transform API falsely reports destructuring as unsupported when the target list contains multiple engines (fixed by Grafana et al. in esbuild 0.27.5+). If esbuild is ever upgraded past 0.27.2, a list can be restored if needed.
- Keep the `es2020` floor (Safari 14+): many members use older iPhones, so do not raise the build target above it.
