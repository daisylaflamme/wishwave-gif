# Project rules

- Keep public Cloud browser connection settings in `public-cloud-config.json` as Vite build fallbacks, with environment values taking precedence; this prevents publishing failures when ignored environment files are absent. Never store service-role keys or other private credentials there.
- Do not edit the generated Cloud client or environment files; keep `.env` files ignored and preserve managed connection configuration.