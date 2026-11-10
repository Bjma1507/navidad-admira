const MODOS_FILTRO_USUARIOS = Object.freeze([
  { valor: 'todos', etiqueta: 'Todas las personas' },
  { valor: 'administradores', etiqueta: 'Administradores' },
  { valor: 'empleados', etiqueta: 'Empleados' },
  { valor: 'sin_clave', etiqueta: 'Aún no crean su clave' },
  { valor: 'sin_votar', etiqueta: 'Aún no votan' }
]);

let estadoUsuarios = null;
let restableciendo = false;
let filtrosUsuarios = { texto: '', modo: 'todos' };
let referenciasUsuarios = null;
let detalleUsuarioAbierto = null;
let temporizadorBusquedaUsuarios = null;

function esAdministradorUsuario(usuario) {
  return usuario.rol === 'admin';
}

function puedeRestablecerUsuario(usuario) {
  return !esAdministradorUsuario(usuario);
}

function buscarUsuario(usuarioId) {
  return estadoUsuarios ? estadoUsuarios.usuarios.find((usuario) => usuario.id === usuarioId) : null;
}

async function cargarUsuarios(conservarVista = false) {
  const contenido = document.getElementById('contenido');
  if (conservarVista !== true) {
    filtrosUsuarios = { texto: '', modo: 'todos' };
    mostrarEsqueletoUsuarios(contenido);
  }
  try {
    const datos = await llamarApi('listarUsuarios', {}, { conSesion: true });
    if (vistaActiva !== 'usuarios') {
      return;
    }
    estadoUsuarios = datos;
    renderizarUsuarios();
    sincronizarDetalleUsuario();
  } catch (error) {
    if (vistaActiva !== 'usuarios') {
      return;
    }
    mostrarErrorUsuarios(contenido, error.message);
  }
}

function mostrarEsqueletoUsuarios(contenido) {
  vaciar(contenido);
  contenido.appendChild(crearElemento('div', { clase: 'resultados__esqueleto', atributos: { 'aria-hidden': 'true' } }, [
    crearElemento('span', { clase: 'esqueleto-cat esqueleto-cat--bloque' }),
    crearElemento('span', { clase: 'esqueleto-cat esqueleto-cat--bloque' })
  ]));
}

function mostrarErrorUsuarios(contenido, mensaje) {
  vaciar(contenido);
  const reintentar = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    texto: 'Reintentar',
    atributos: { type: 'button' }
  });
  reintentar.addEventListener('click', () => cargarUsuarios());
  contenido.appendChild(crearElemento('div', { clase: 'vacio-cat' }, [
    crearElemento('span', { clase: 'vacio-cat__icono vacio-cat__icono--alerta' }, [crearIcono('alerta')]),
    crearElemento('p', { clase: 'vacio-cat__titulo', texto: 'No se pudo cargar la lista de usuarios' }),
    crearElemento('p', { clase: 'vacio-cat__texto', texto: mensaje, atributos: { role: 'alert' } }),
    reintentar
  ]));
}

function renderizarUsuarios() {
  const contenido = document.getElementById('contenido');
  vaciar(contenido);
  const vista = crearElemento('section', { clase: 'vista-cat', atributos: { 'aria-label': 'Usuarios' } });
  vista.appendChild(renderizarEncabezadoUsuarios());
  vista.appendChild(renderizarMetricasUsuarios());
  vista.appendChild(renderizarFiltrosUsuarios());
  referenciasUsuarios.contenedor = crearElemento('div', { clase: 'lista-usuarios', atributos: { 'aria-live': 'polite' } });
  vista.appendChild(referenciasUsuarios.contenedor);
  contenido.appendChild(vista);
  actualizarListaUsuarios();
}

function renderizarEncabezadoUsuarios() {
  const copiar = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    atributos: { type: 'button', title: 'Copia los nombres de quienes aún no votan en ninguna categoría' }
  }, [crearIcono('copiar'), crearElemento('span', { texto: 'Copiar pendientes' })]);
  copiar.addEventListener('click', copiarPendientesUsuarios);
  return crearElemento('header', { clase: 'cabecera-cat' }, [
    crearElemento('div', { clase: 'cabecera-cat__fila' }, [
      crearElemento('span', { clase: 'cabecera-cat__icono' }, [crearIcono('usuarios')]),
      crearElemento('h2', { clase: 'cabecera-cat__titulo', texto: 'Usuarios' }),
      crearElemento('span', { clase: 'cabecera-cat__linea', atributos: { 'aria-hidden': 'true' } }),
      crearElemento('div', { clase: 'cabecera-cat__accion' }, [copiar])
    ]),
    crearElemento('p', {
      clase: 'cabecera-cat__subtitulo',
      texto: 'Revisa quién ya entró, quién falta por votar y restablece claves.'
    })
  ]);
}

function renderizarMetricasUsuarios() {
  const usuarios = estadoUsuarios.usuarios;
  const total = usuarios.length;
  const conClave = usuarios.filter((usuario) => !usuario.claveTemporalPendiente).length;
  const quienesVotaron = usuarios.filter((usuario) => usuario.categoriasVotadas > 0).length;
  const propuestas = usuarios.reduce((suma, usuario) => suma + usuario.propuestas, 0);
  const lista = crearElemento('dl', { clase: 'usuarios-metricas' });
  [
    ['Personas', String(total)],
    ['Ya crearon su clave', conClave + ' de ' + total],
    ['Ya votaron', quienesVotaron + ' de ' + total],
    ['Propuestas', String(propuestas)]
  ].forEach(([etiqueta, valor]) => {
    lista.appendChild(crearElemento('div', { clase: 'admin-metrica' }, [
      crearElemento('dd', { texto: valor }),
      crearElemento('dt', { texto: etiqueta })
    ]));
  });
  return lista;
}

function renderizarFiltrosUsuarios() {
  const formulario = crearElemento('form', {
    clase: 'filtros',
    atributos: { role: 'search', 'aria-label': 'Buscar y filtrar usuarios' }
  });
  const entrada = crearElemento('input', {
    atributos: {
      id: 'filtro-usuarios-busqueda',
      type: 'search',
      placeholder: 'Buscar por nombre o puesto',
      autocomplete: 'off',
      maxlength: '80',
      'aria-label': 'Buscar por nombre o puesto'
    }
  });
  entrada.value = filtrosUsuarios.texto;
  entrada.addEventListener('input', () => {
    clearTimeout(temporizadorBusquedaUsuarios);
    temporizadorBusquedaUsuarios = setTimeout(() => {
      filtrosUsuarios.texto = entrada.value;
      actualizarListaUsuarios();
    }, 150);
  });
  const selector = crearElemento('select', { atributos: { id: 'filtro-usuarios-modo', 'aria-label': 'Mostrar' } });
  MODOS_FILTRO_USUARIOS.forEach((modo) => {
    selector.appendChild(crearElemento('option', { texto: modo.etiqueta, atributos: { value: modo.valor } }));
  });
  selector.value = filtrosUsuarios.modo;
  selector.addEventListener('change', () => {
    filtrosUsuarios.modo = selector.value;
    actualizarListaUsuarios();
  });
  const limpiar = crearElemento('button', {
    clase: 'boton boton--fantasma boton--chico',
    atributos: { type: 'button', hidden: '' }
  }, [crearIcono('cerrar'), crearElemento('span', { texto: 'Limpiar' })]);
  limpiar.addEventListener('click', limpiarFiltrosUsuarios);
  formulario.addEventListener('submit', (evento) => evento.preventDefault());
  formulario.appendChild(crearElemento('label', { clase: 'buscador', atributos: { for: 'filtro-usuarios-busqueda' } }, [
    crearIcono('buscar'),
    entrada
  ]));
  formulario.appendChild(crearElemento('div', { clase: 'selector' }, [
    crearElemento('span', { clase: 'selector__etiqueta', texto: 'Mostrar' }),
    selector,
    crearIcono('flecha-abajo')
  ]));
  formulario.appendChild(limpiar);
  referenciasUsuarios = { entrada, selector, limpiar };
  return formulario;
}

function hayFiltrosUsuariosActivos() {
  return filtrosUsuarios.texto.trim() !== '' || filtrosUsuarios.modo !== 'todos';
}

function limpiarFiltrosUsuarios() {
  filtrosUsuarios = { texto: '', modo: 'todos' };
  referenciasUsuarios.entrada.value = '';
  referenciasUsuarios.selector.value = 'todos';
  referenciasUsuarios.entrada.focus();
  actualizarListaUsuarios();
}

function usuariosFiltrados() {
  const busqueda = normalizarBusqueda(filtrosUsuarios.texto);
  return estadoUsuarios.usuarios.filter((usuario) => {
    if (busqueda) {
      const coincide = normalizarBusqueda(usuario.nombre).includes(busqueda)
        || normalizarBusqueda(usuario.puesto).includes(busqueda);
      if (!coincide) {
        return false;
      }
    }
    switch (filtrosUsuarios.modo) {
      case 'administradores':
        return esAdministradorUsuario(usuario);
      case 'empleados':
        return !esAdministradorUsuario(usuario);
      case 'sin_clave':
        return usuario.claveTemporalPendiente;
      case 'sin_votar':
        return usuario.categoriasVotadas === 0;
      default:
        return true;
    }
  });
}

function actualizarListaUsuarios() {
  const { contenedor, limpiar } = referenciasUsuarios;
  limpiar.hidden = !hayFiltrosUsuariosActivos();
  vaciar(contenedor);
  const usuarios = usuariosFiltrados();
  if (usuarios.length === 0) {
    const restablecer = crearElemento('button', {
      clase: 'boton boton--secundario boton--chico',
      texto: 'Limpiar filtros',
      atributos: { type: 'button' }
    });
    restablecer.addEventListener('click', limpiarFiltrosUsuarios);
    contenedor.appendChild(crearElemento('div', { clase: 'vacio-cat' }, [
      crearElemento('span', { clase: 'vacio-cat__icono' }, [crearIcono('buscar')]),
      crearElemento('p', { clase: 'vacio-cat__titulo', texto: 'Sin resultados' }),
      crearElemento('p', { clase: 'vacio-cat__texto', texto: 'Ninguna persona coincide con la búsqueda o el filtro.' }),
      restablecer
    ]));
    return;
  }
  contenedor.appendChild(crearElemento('p', {
    clase: 'lista-resumen',
    texto: 'Mostrando ' + usuarios.length + ' de ' + pluralizar(estadoUsuarios.usuarios.length, 'persona', 'personas')
  }));
  contenedor.appendChild(renderizarTablaUsuarios(usuarios));
}

function renderizarTablaUsuarios(usuarios) {
  const encabezados = ['Persona', 'Rol', 'Clave', 'Participación'].map((texto) => (
    crearElemento('th', { texto, atributos: { scope: 'col' } })
  ));
  encabezados.push(crearElemento('th', { atributos: { scope: 'col' } }, [
    crearElemento('span', { clase: 'visualmente-oculto', texto: 'Acciones' })
  ]));
  const cuerpo = crearElemento('tbody');
  usuarios.forEach((usuario) => cuerpo.appendChild(renderizarFilaUsuario(usuario)));
  return crearElemento('div', { clase: 'tabla-cat' }, [
    crearElemento('table', { clase: 'tabla-usuarios' }, [
      crearElemento('thead', {}, [crearElemento('tr', {}, encabezados)]),
      cuerpo
    ])
  ]);
}

function crearPastillaUsuario(texto, variante, icono) {
  const hijos = icono ? [crearIcono(icono), crearElemento('span', { texto })] : [crearElemento('span', { texto })];
  return crearElemento('span', { clase: 'pastilla' + (variante ? ' pastilla--' + variante : '') }, hijos);
}

function crearPastillaRolUsuario(usuario) {
  return esAdministradorUsuario(usuario)
    ? crearPastillaUsuario('Administrador', 'admin', 'usuario')
    : crearPastillaUsuario('Empleado', '', 'usuario');
}

function crearPastillaClaveUsuario(usuario) {
  return usuario.claveTemporalPendiente
    ? crearPastillaUsuario('Pendiente', 'aviso', 'reloj')
    : crearPastillaUsuario('Creada', 'ok', 'circulo-check');
}

function crearParticipacionUsuario(usuario) {
  const total = estadoUsuarios.totalCategorias;
  const barra = crearElemento('div', { clase: 'barra-cat', atributos: { role: 'presentation' } }, [
    crearElemento('span', { clase: 'barra-cat__relleno' })
  ]);
  barra.style.setProperty('--avance', (total > 0 ? Math.round((usuario.categoriasVotadas / total) * 100) : 0) + '%');
  return crearElemento('div', { clase: 'participacion' }, [
    crearElemento('span', { clase: 'participacion__texto', texto: 'Votó en ' + usuario.categoriasVotadas + ' de ' + total }),
    barra,
    crearElemento('span', { clase: 'participacion__nota', texto: pluralizar(usuario.propuestas, 'propuesta', 'propuestas') })
  ]);
}

function crearCeldaUsuario(etiqueta, hijos, clase) {
  const atributos = etiqueta ? { 'data-etiqueta': etiqueta } : {};
  return crearElemento('td', { clase: clase || '', atributos }, hijos);
}

function renderizarFilaUsuario(usuario) {
  const persona = crearElemento('button', {
    clase: 'persona-enlace',
    atributos: { type: 'button', 'aria-label': 'Ver detalles de ' + usuario.nombre }
  }, [
    crearInsigniaIniciales(usuario.nombre),
    crearElemento('span', { clase: 'persona-celda' }, [
      crearElemento('strong', { clase: 'persona-celda__nombre', texto: usuario.nombre }),
      crearElemento('span', { clase: 'persona-celda__puesto', texto: usuario.puesto })
    ])
  ]);
  persona.addEventListener('click', () => abrirDetalleUsuario(usuario.id));
  const roles = [crearPastillaRolUsuario(usuario)];
  if (!usuario.activo) {
    roles.push(crearPastillaUsuario('Inactivo', 'neutra'));
  }
  const ver = crearBotonIcono('ojo', 'Ver detalles de ' + usuario.nombre, 'detalle__icono-boton--borde');
  ver.addEventListener('click', () => abrirDetalleUsuario(usuario.id));
  const acciones = crearElemento('div', { clase: 'acciones-fila' }, [ver]);
  if (puedeRestablecerUsuario(usuario)) {
    const llave = crearBotonIcono('llave', 'Restablecer la clave de ' + usuario.nombre, 'detalle__icono-boton--borde');
    llave.addEventListener('click', () => restablecerClaveDe(usuario));
    acciones.appendChild(llave);
  }
  return crearElemento('tr', {}, [
    crearCeldaUsuario('', [persona]),
    crearCeldaUsuario('Rol', [crearElemento('div', { clase: 'pastillas-fila' }, roles)]),
    crearCeldaUsuario('Clave', [crearPastillaClaveUsuario(usuario)]),
    crearCeldaUsuario('Participación', [crearParticipacionUsuario(usuario)]),
    crearCeldaUsuario('', [acciones], 'tabla-usuarios__acciones')
  ]);
}

function abrirDetalleUsuario(usuarioId) {
  if (detalleUsuarioAbierto || !buscarUsuario(usuarioId)) {
    return;
  }
  const modal = crearModal('modal--detalle', 'titulo-detalle-usuario');
  detalleUsuarioAbierto = { usuarioId, modal };
  modal.addEventListener('close', () => {
    detalleUsuarioAbierto = null;
  });
  abrirModal(modal);
  sincronizarDetalleUsuario();
  const cerrar = modal.querySelector('.detalle__icono-boton');
  if (cerrar) {
    cerrar.focus();
  }
}

function sincronizarDetalleUsuario() {
  if (!detalleUsuarioAbierto) {
    return;
  }
  const usuario = buscarUsuario(detalleUsuarioAbierto.usuarioId);
  if (!usuario) {
    detalleUsuarioAbierto.modal.close();
    return;
  }
  const { modal } = detalleUsuarioAbierto;
  vaciar(modal);
  modal.appendChild(construirDetalleUsuario(usuario));
}

function construirDetalleUsuario(usuario) {
  const cerrar = crearBotonIcono('cerrar', 'Cerrar');
  cerrar.addEventListener('click', () => detalleUsuarioAbierto.modal.close());
  const datos = crearElemento('ul', { clase: 'detalle__meta' }, [crearFilaMeta('usuario', usuario.puesto)]);
  if (usuario.correo) {
    datos.appendChild(crearFilaMeta('correo', usuario.correo));
  }
  const pastillas = [crearPastillaRolUsuario(usuario), crearPastillaClaveUsuario(usuario)];
  if (!usuario.activo) {
    pastillas.push(crearPastillaUsuario('Inactivo', 'neutra'));
  }
  const cabecera = crearElemento('header', { clase: 'persona__cabecera' }, [
    crearElemento('div', { clase: 'detalle__barra' }, [
      crearElemento('p', { clase: 'detalle__categoria' }, [crearIcono('usuarios'), crearElemento('span', { texto: 'Usuario' })]),
      crearElemento('div', { clase: 'detalle__herramientas' }, [cerrar])
    ]),
    crearElemento('div', { clase: 'persona__identidad' }, [
      crearInsigniaIniciales(usuario.nombre, 'iniciales--grande'),
      crearElemento('h2', { clase: 'detalle__titulo', texto: usuario.nombre, atributos: { id: 'titulo-detalle-usuario' } })
    ]),
    datos,
    crearElemento('div', { clase: 'pastillas-fila' }, pastillas)
  ]);
  const cuerpo = crearElemento('div', { clase: 'persona__cuerpo' }, [
    crearElemento('h3', { clase: 'persona__subtitulo', texto: 'Participación' }),
    crearElemento('p', {
      clase: 'persona__resumen',
      texto: 'Votó en ' + usuario.categoriasVotadas + ' de ' + pluralizar(estadoUsuarios.totalCategorias, 'categoría', 'categorías')
        + ' · ' + pluralizar(usuario.propuestas, 'propuesta', 'propuestas')
    })
  ]);
  usuario.participacion.forEach((item) => cuerpo.appendChild(construirParticipacionCategoriaUsuario(item)));
  return crearElemento('div', { clase: 'persona' }, [cabecera, cuerpo, construirPieUsuario(usuario)]);
}

function crearMedidaUsuario(etiqueta, valor, maximo) {
  const barra = crearElemento('div', { clase: 'barra-cat', atributos: { role: 'presentation' } }, [
    crearElemento('span', { clase: 'barra-cat__relleno' })
  ]);
  barra.style.setProperty('--avance', (maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0) + '%');
  return crearElemento('div', { clase: 'persona-cat__medida' }, [
    crearElemento('div', { clase: 'persona-cat__fila' }, [
      crearElemento('span', { texto: etiqueta }),
      crearElemento('strong', { texto: valor + ' de ' + maximo })
    ]),
    barra
  ]);
}

function construirParticipacionCategoriaUsuario(item) {
  const vista = configuracionVista(item.categoriaId);
  return crearElemento('article', { clase: 'persona-cat' }, [
    crearElemento('header', { clase: 'persona-cat__cabecera' }, [
      crearIcono(vista.icono),
      crearElemento('h4', { texto: item.nombre })
    ]),
    crearMedidaUsuario('Propuestas', item.propuestas, estadoUsuarios.limites.propuestasPorUsuario),
    crearMedidaUsuario('Votos', item.votos, NIVELES.length)
  ]);
}

function construirPieUsuario(usuario) {
  if (!puedeRestablecerUsuario(usuario)) {
    return crearElemento('footer', { clase: 'persona__pie' }, [
      crearElemento('p', {
        clase: 'persona__nota',
        texto: 'La clave de los administradores no se restablece desde el panel.'
      })
    ]);
  }
  const boton = crearElemento('button', {
    clase: 'boton boton--secundario',
    atributos: { type: 'button' }
  }, [crearIcono('llave'), crearElemento('span', { texto: 'Restablecer clave' })]);
  boton.addEventListener('click', () => restablecerClaveDe(usuario));
  return crearElemento('footer', { clase: 'persona__pie' }, [boton]);
}

async function restablecerClaveDe(usuario) {
  if (restableciendo) {
    return;
  }
  const confirmado = await confirmarAccion({
    titulo: 'Restablecer clave',
    mensaje: 'La clave actual de ' + usuario.nombre + ' dejará de funcionar. Se generará una clave temporal que verás una sola vez.',
    textoConfirmar: 'Restablecer',
    peligro: false
  });
  if (!confirmado) {
    return;
  }
  restableciendo = true;
  const contenido = document.getElementById('contenido');
  contenido.classList.add('ocupado');
  try {
    const datos = await llamarApi('restablecerClave', { usuarioId: usuario.id }, { conSesion: true });
    mostrarClaveTemporal(datos);
    await cargarUsuarios(true);
  } catch (error) {
    mostrarAviso(error.message, true);
  } finally {
    contenido.classList.remove('ocupado');
    restableciendo = false;
  }
}

function mostrarClaveTemporal(datos) {
  const modal = crearModal('modal--confirmar', 'titulo-clave-temporal');
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) {
      evento.stopImmediatePropagation();
    }
  }, true);
  modal.addEventListener('cancel', (evento) => evento.preventDefault());
  const clave = crearElemento('output', { clase: 'clave-caja', texto: datos.claveTemporal });
  const etiquetaCopiar = crearElemento('span', { texto: 'Copiar' });
  const copiar = crearElemento('button', {
    clase: 'boton boton--secundario',
    atributos: { type: 'button' }
  }, [crearIcono('copiar'), etiquetaCopiar]);
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(datos.claveTemporal);
      etiquetaCopiar.textContent = 'Copiada';
    } catch (_) {
      etiquetaCopiar.textContent = 'Cópiala a mano';
    }
    setTimeout(() => {
      if (copiar.isConnected) {
        etiquetaCopiar.textContent = 'Copiar';
      }
    }, 2000);
  });
  const listo = crearElemento('button', { clase: 'boton', texto: 'Listo', atributos: { type: 'button' } });
  listo.addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    clave.textContent = '';
  });
  modal.appendChild(crearElemento('div', { clase: 'modal__cuerpo modal__cuerpo--confirmar' }, [
    crearElemento('span', { clase: 'modal__icono' }, [crearIcono('llave')]),
    crearElemento('h2', { clase: 'modal__titulo', texto: 'Clave temporal', atributos: { id: 'titulo-clave-temporal' } }),
    crearElemento('p', {
      clase: 'modal__texto',
      texto: 'Entrégale esta clave a ' + datos.nombre + '. Al entrar deberá crear una clave propia.'
    }),
    clave,
    crearElemento('p', {
      clase: 'modal__texto modal__texto--aviso',
      texto: 'Se muestra una sola vez. Al cerrar esta ventana no se podrá volver a ver.'
    }),
    crearElemento('div', { clase: 'modal__acciones' }, [copiar, listo])
  ]));
  abrirModal(modal);
  copiar.focus();
}

async function copiarPendientesUsuarios() {
  const pendientes = estadoUsuarios.usuarios.filter((usuario) => usuario.activo && usuario.categoriasVotadas === 0);
  if (pendientes.length === 0) {
    mostrarAviso('Todas las personas ya votaron.');
    return;
  }
  const texto = 'Pendientes de votar (' + pendientes.length + '):\n' + pendientes.map((usuario) => '• ' + usuario.nombre).join('\n');
  try {
    await navigator.clipboard.writeText(texto);
    mostrarAviso('Lista copiada: ' + pluralizar(pendientes.length, 'persona', 'personas') + '.');
  } catch (_) {
    mostrarAviso('No se pudo copiar la lista.', true);
  }
}

function iniciarDialogoClave() {
  const anterior = document.getElementById('dialogo-clave');
  if (anterior) {
    anterior.remove();
  }
}