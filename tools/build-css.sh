#!/usr/bin/env bash
# Reconstruye css/app.css = fuentes locales (tools/fonts.css) + Tailwind compilado.
# Ejecutar SIEMPRE tras añadir clases de Tailwind nuevas a cualquiera de las tres páginas. Requiere Node.
# Uso (desde la raíz del proyecto):  bash tools/build-css.sh
set -e
cd "$(dirname "$0")"
TMP="$(mktemp)"
npx --yes tailwindcss@3.4.17 -c tw.config.js -i in.css -o "$TMP" --minify
cat fonts.css "$TMP" > ../css/app.css
rm -f "$TMP"
echo "css/app.css reconstruido: $(wc -c < ../css/app.css) bytes"
