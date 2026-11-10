## Actualización de sesión: sección Restaurante

Pegar al final del `README.md` (sección de historial de cambios) y guardar `docs/API.md` como `docs/API.md` en el repositorio.

### Qué cambió

- Vista de categoría rediseñada: encabezado con icono y subtítulo, botón "Nueva propuesta" con contador, "Mis votos", búsqueda, filtro "Mostrar", lista paginada (6 por página) modal de nueva propuesta y hoja lateral de detalles (pestañas Información y Comentarios, voto fijo al pie, botón de enlace). En celular la hoja sube desde abajo.
- Pestañas Propuestas, Resultados y Administración. Las personas empleadas con la categoría abierta ven solo la lista, sin barra de pestañas.
- Pestaña Administración en dos columnas: Reglas a la izquierda; Estado (insignia Abierta/Cerrada, propuestas, votos emitidos y participación) y Moderación a la derecha. "Guardar reglas" se activa solo con cambios y muestra "Cambios sin guardar". Una categoría cerrada por error se reabre con "Reabrir categoría".
- Restaurante usa un formulario nuevo: nombre del lugar, ubicación, enlace opcional y nota opcional. Tipo de comida y precio ya no existen.
- Backend: acciones `eliminarPropuesta`, `listarComentarios`, `crearComentario` y `eliminarComentario`. `listarPropuestas` agrega comentarios, votos (solo administradores o categoría cerrada), `puedeEliminar` y límites.

### Dónde va cada archivo

Backend (Apps Script, luego "Nueva versión" en Administrar implementaciones):

| Archivo | Acción |
| --- | --- |
| `Main.gs` | Reemplazar |
| `Propuestas.gs` | Reemplazar |
| `Consultas.gs` | Reemplazar |
| `Comentarios.gs` | Archivo nuevo (borrar la plantilla `function myFunction() {`) |

Front:

| Archivo | Acción |
| --- | --- |
| `js/categoria.js`, `js/formulario.js`, `js/resultados.js`, `js/administracion.js` | Reemplazar |
| `js/utilidades.js`, `js/dialogos.js`, `js/detalle.js` | Nuevos |
| `css/categoria.css` | Nuevo |

### Cambios en `panel.html`

1. En el `<head>`, después de los demás estilos: `<link rel="stylesheet" href="css/categoria.css">`.
2. Orden de scripts (todos con `defer`), sustituyendo el bloque actual de `iconos.js` hasta `administracion.js`: `iconos.js`, `utilidades.js`, `dialogos.js`, `categoria.js`, `formulario.js`, `detalle.js`, `resultados.js`, `administracion.js`.
3. Eliminar el `<dialog id="dialogo-propuesta">` antiguo. Si se deja, el script lo quita al iniciar.

### Ubicación

El detalle no incrusta mapa ni usa claves de Google. La ubicación se muestra como texto; si la propuesta trae enlace, aparece el botón "Visitar".

### Pruebas sugeridas

1. Empleada: proponer, ver "x de 3", intentar una cuarta, ocultar nombre, buscar, filtrar, paginar.
2. Detalles: comentar, votar desde el selector, ver "Mis votos" actualizado, quitar.
3. Eliminar propia sin votos de otras personas; con voto ajeno debe quedar deshabilitado.
4. Administradora: ver votos por propuesta, pestañas, eliminar propuesta y comentario ajeno, cerrar y reabrir.
5. Con la categoría cerrada: nadie propone, comenta ni vota; todas ven los votos.
6. Celular, modo claro y oscuro.

### Notas

- Los iconos nuevos (buscar, más, mensaje, papelera, cerrar, estrella, etc.) viven en el sprite de `panel.html`; ya no existe `iconos-extra.js`.
- "Nueva propuesta" se deshabilita al llegar al máximo (3 de 3) y muestra "Límite alcanzado"; se habilita al eliminar una propia.

- Las propuestas de prueba actuales de Restaurante conservan campos antiguos (`tipoComida`, `precio`); no se muestran. Conviene borrarlas antes del uso real.
- Los comentarios se bloquean con la categoría cerrada y cada persona puede publicar hasta 10 por propuesta.
- Al eliminar una propuesta, un administrador también quita los votos que otras personas le dieron.

## Actualización de sesión: sección Usuarios

### Qué cambió

- Vista rediseñada con el mismo lenguaje que las categorías: encabezado con icono, métricas (personas, claves creadas, quienes ya votaron, propuestas), búsqueda por nombre o puesto, filtro "Mostrar" (todas, administradores, empleados, aún no crean su clave, aún no votan) y tabla con rol, estado de la clave, participación y acciones. En celular cada fila pasa a tarjeta.
- Hoja lateral de detalle por persona: puesto, correo, rol, estado de la clave y participación por categoría (propuestas y votos). No muestra qué votó cada persona.
- Restablecer clave: confirmación con modal propio y ventana de clave temporal nueva con "Copiar". La ventana no se cierra con clic fuera ni con Esc, solo con "Listo", para no perder la clave.
- "Copiar pendientes": copia los nombres de las personas activas que aún no votan en ninguna categoría.
- Solo se restablece la clave de empleados. El backend rechaza restablecer la propia y la de otro administrador.

### Dónde va cada archivo

| Archivo | Acción |
| --- | --- |
| Apps Script: archivo que contiene `manejarListarUsuarios` y `manejarRestablecerClave` | Reemplazar su contenido con `backend/Usuarios.gs`, luego "Nueva versión" en Administrar implementaciones |
| `js/usuarios.js` | Reemplazar |
| `css/categoria.css` | Reemplazar |
| `panel.html` | Reemplazar (agrega iconos copiar, llave y correo y elimina el `<dialog id="dialogo-clave">`) |
| `docs/API.md` | Reemplazar |

### Pruebas sugeridas

1. Filtrar por cada opción de "Mostrar", buscar por puesto y limpiar.
2. Abrir el detalle de una persona y revisar participación por categoría.
3. Restablecer la clave de un empleado: confirmar, copiar la clave, intentar cerrar con clic fuera o Esc (no debe cerrar) y cerrar con "Listo".
4. Verificar que los administradores no muestran botón de restablecer y que el detalle lo explica.
5. "Copiar pendientes" y pegar el resultado.
6. Celular, modo claro y oscuro.

### Notas

- `iniciarDialogoClave` se conserva en `usuarios.js` solo para que `panel.js` no falle; ya no hace nada salvo retirar el diálogo antiguo si existiera. Se puede eliminar junto con su llamada cuando se revise `panel.js`.
- La respuesta de `listarUsuarios` ahora incluye `correo`, `participacion` y `limites`.