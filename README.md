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

1. Abrí **Settings → Pages** en el repositorio de GitHub.
2. En **Build and deployment**, elegí **Deploy from a branch**.
3. Seleccioná la rama `main` y la carpeta `/ (root)`, y guardá los cambios.
4. Esperá a que finalice la primera publicación. GitHub muestra la dirección
   pública en **Settings → Pages**.

Las nuevas confirmaciones que subas a `main` se publican automáticamente.

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
