# Portfolio — Lorenzo Vilche Souza

Portfolio personal estático, construido con HTML, CSS y JavaScript. Incluye
una escena 3D interactiva y cinco proyectos creativos.

## Probar localmente

Serví esta carpeta con cualquier servidor HTTP estático. Abrir `index.html`
directamente puede impedir que el navegador cargue los módulos de la escena 3D.
Three.js y MeshoptDecoder se obtienen de un CDN; la escena también requiere
WebGL. Si WebGL o la conexión no están disponibles, se muestra una imagen de
respaldo.

## Publicar en GitHub Pages

El workflow de GitHub Actions en `.github/workflows/pages.yml` publica el sitio
automáticamente cada vez que se actualiza la rama `main`.

1. Subí el proyecto a un repositorio público de GitHub, en la rama `main`.
2. En **Settings → Pages**, elegí **GitHub Actions** como fuente de publicación.
3. Esperá a que finalice el workflow **Deploy portfolio to GitHub Pages**. La URL
   pública aparece en **Settings → Pages** y en el resultado del workflow.

## Contenido

- `index.html`: presentación, datos de contacto y selección de proyectos.
- `hero3d.js`: escena interactiva del modelo 3D de Cogollo.
- `styles.css` y `script.js`: diseño, adaptación a pantallas y animaciones.
- `assets/portfolio/`: imágenes optimizadas para las tarjetas del portfolio.
- Las carpetas `clubbb/`, `ESTETICA/`, `CONSULTORIO ODONTOLOGICO/` y
  `NUTRICIONISTA/` contienen los proyectos enlazados.
- `Focaccia-y-Mate-Propuesta.pdf`: propuesta de identidad visual de Focaccia y
  Mate.

El archivo `.gitignore` excluye entornos locales, configuración privada,
grabaciones de referencia y videos que no utiliza el sitio.
