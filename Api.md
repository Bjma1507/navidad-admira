# Contrato de API: propuestas, comentarios y votos

Documento para el front y para cualquier backend futuro. Describe únicamente las acciones de esta sección. Las demás acciones (login, usuarios, dashboard, reglas y cierre de categorías) se documentarán en sesiones siguientes.

## Convenciones

- Transporte: `POST` al endpoint con cuerpo JSON que incluye `accion`, la credencial de sesión y los datos de la solicitud. El formato exacto del envoltorio de respuesta (`responderOk` y `responderError`) y de la credencial se documentará junto con las acciones de login.
- Cada acción responde con el objeto descrito en su sección "Respuesta".
- Los errores llevan un `codigo` estable (por ejemplo `CATEGORIA_CERRADA`) y un `mensaje` apto para mostrar a la persona.
- Todas las acciones de este documento requieren sesión.
- Fechas en ISO 8601 (UTC).
- Los textos se normalizan en el servidor (espacios repetidos y saltos de línea se reducen a un espacio) y se validan con `esTextoSeguro` (protección contra inyección de fórmulas en la hoja).

## listarPropuestas

Solicitud: `{ categoriaId }`

Respuesta:

```json
{
  "categoria": { "id": "restaurante", "nombre": "Restaurante", "estado": "abierta", "presupuesto": "", "requisitos": "" },
  "campos": [
    { "clave": "ubicacion", "etiqueta": "Ubicación", "tipo": "texto", "max": 150, "requerido": true },
    { "clave": "enlace", "etiqueta": "Enlace", "tipo": "url", "max": 300, "requerido": false },
    { "clave": "nota", "etiqueta": "Nota", "tipo": "texto", "max": 300, "requerido": false }
  ],
  "limites": { "propuestasPorUsuario": 3, "comentario": 300 },
  "resultadosVisibles": false,
  "propuestas": [
    {
      "id": "…", "categoriaId": "restaurante", "titulo": "La Casa de Toño",
      "datos": { "ubicacion": "…", "enlace": "", "nota": "" },
      "anonima": false, "fecha": "2026-11-09T16:25:00.000Z",
      "autor": "Ana Pérez", "esMia": false,
      "comentarios": 2, "votos": null, "puntos": null, "puedeEliminar": false
    }
  ],
  "misVotos": [ { "propuestaId": "…", "nivel": 3 } ]
}
```

Reglas:

- `propuestas` va ordenada de la más reciente a la más antigua.
- `autor` es `null` cuando la propuesta es anónima y quien consulta no es su autor ni administrador.
- `votos` y `puntos` son `null` mientras la categoría esté abierta, salvo para administradores. Con la categoría cerrada los ven todas las personas.
- `resultadosVisibles` es `true` para administradores o con la categoría cerrada.
- `puedeEliminar` es `true` si es administrador, o si es la persona autora, la categoría está abierta y nadie más ha votado por la propuesta.
- `campos` describe el formulario de la categoría. El título de la propuesta (`titulo`) siempre existe y no aparece en `campos`.

## crearPropuesta

Solicitud: `{ categoriaId, titulo, datos, anonima }`

- `titulo`: 3 a 80 caracteres.
- `datos`: objeto con las claves de `campos`. Restaurante: `ubicacion` (obligatoria, 150), `enlace` (opcional, `https://`, 300), `nota` (opcional, 300).
- `anonima`: booleano.

Respuesta: `{ "id": "…" }`

Errores: `DATOS_INVALIDOS`, `CATEGORIA_CERRADA`, `CATEGORIA_INVALIDA`, `LIMITE_PROPUESTAS`.

## eliminarPropuesta

Solicitud: `{ propuestaId }`

Respuesta: `{ "eliminada": true, "votosEliminados": 0 }`

Efectos: la propuesta queda oculta (no se borra la fila), se eliminan sus votos y sus comentarios, se libera el cupo de la persona autora y, si era la ganadora elegida, se limpia la ganadora.

Errores: `PROPUESTA_INVALIDA`, `SIN_PERMISO`, `CATEGORIA_CERRADA`, `PROPUESTA_CON_VOTOS`.

## listarComentarios

Solicitud: `{ propuestaId }`

Respuesta:

```json
{
  "comentarios": [
    {
      "id": "…", "autor": "Beto Ruiz", "anonimo": false, "esMio": false,
      "esAutorPropuesta": false, "fecha": "2026-11-09T12:00:00.000Z",
      "texto": "Fui el año pasado y estuvo buenísimo.", "puedeEliminar": false
    }
  ]
}
```

Reglas:

- Orden cronológico ascendente.
- Si la propuesta es anónima, los comentarios de su autor llevan `anonimo: true` y `autor: null` para el resto de personas. El propio autor y los administradores reciben el nombre.
- `puedeEliminar` es `true` para administradores, o para la persona autora del comentario con la categoría abierta.

Errores: `PROPUESTA_INVALIDA`.

## crearComentario

Solicitud: `{ propuestaId, texto }`

- `texto`: 1 a 300 caracteres.
- Máximo 10 comentarios por persona y propuesta (los administradores no tienen límite).
- Solo con la categoría abierta.

Respuesta: `{ "comentario": { …mismo formato que listarComentarios… } }`

Errores: `DATOS_INVALIDOS`, `PROPUESTA_INVALIDA`, `CATEGORIA_CERRADA`, `LIMITE_COMENTARIOS`.

## eliminarComentario

Solicitud: `{ comentarioId }`

Respuesta: `{ "eliminado": true }`

Permisos: administradores siempre; el resto solo sus propios comentarios y con la categoría abierta.

Errores: `COMENTARIO_INVALIDO`, `SIN_PERMISO`, `CATEGORIA_CERRADA`.

## listarUsuarios

Solicitud: sin parámetros. Solo administradores.

Respuesta:

```json
{
  "totalCategorias": 3,
  "limites": { "propuestasPorUsuario": 3 },
  "usuarios": [
    {
      "id": "…",
      "nombre": "…",
      "puesto": "…",
      "correo": "…",
      "rol": "admin | empleado",
      "activo": true,
      "claveTemporalPendiente": true,
      "categoriasVotadas": 2,
      "propuestas": 4,
      "participacion": [
        { "categoriaId": "restaurante", "nombre": "Restaurante", "propuestas": 2, "votos": 3 }
      ]
    }
  ]
}
```

- `participacion` trae una entrada por cada categoría existente. `votos` cuenta los niveles votados (máximo 3) y `propuestas` las propuestas visibles de la persona.
- `categoriasVotadas` es el número de categorías con al menos un voto; `propuestas` es el total de todas las categorías.
- No se expone qué propuesta votó cada persona.

## restablecerClave

Solicitud: `{ usuarioId }`. Solo administradores.

Respuesta: `{ usuarioId, nombre, claveTemporal }`. La clave temporal se devuelve una sola vez.

Reglas: solo se restablece la clave de personas con rol `empleado`; no se permite restablecer la propia ni la de otro administrador.

Errores: `DATOS_INVALIDOS` (clave propia), `USUARIO_INVALIDO`, `SIN_PERMISO` (usuario administrador o sesión sin rol de administrador).

## votar y quitarVoto (sin cambios)

- `votar`: `{ categoriaId, propuestaId, nivel }` con `nivel` 1, 2 o 3. Reemplaza el voto del mismo nivel y cualquier otro voto de la misma persona sobre esa propuesta.
- `quitarVoto`: `{ categoriaId, nivel }`.

## Almacenamiento (Google Sheet)

| Pestaña | Columnas |
| --- | --- |
| Propuestas | id, categoriaId, usuarioId, titulo, datos (JSON), anonima, fecha, oculta |
| Comentarios | id, propuestaId, usuarioId, texto, fecha |
| Votos | id, usuarioId, categoriaId, propuestaId, nivel, fecha |

Las columnas `titulo` (Propuestas) y `texto` (Comentarios) se escriben como texto plano para evitar que Sheets convierta valores como `1/2` en fechas.