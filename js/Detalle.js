const CLAVES_DESTACADAS = Object.freeze(['ubicacion', 'enlace', 'nota']);
const LONGITUD_COMENTARIO_PREDETERMINADA = 300;

const PESTANAS_DETALLE = Object.freeze([
  { clave: 'informacion', etiqueta: 'Información', icono: 'lista' },
  { clave: 'comentarios', etiqueta: 'Comentarios', icono: 'mensaje' }
]);

let detalleAbierto = null;

function propuestaDelDetalle() {
  return detalleAbierto ? buscarPropuesta(detalleAbierto.propuestaId) : null;
}

function limiteComentario() {
  const limites = estadoCategoria.limites;
  return limites && limites.comentario ? limites.comentario : LONGITUD_COMENTARIO_PREDETERMINADA;
}

function nombreDeEnlace(valor) {
  try {
    return new URL(valor).hostname.replace(/^www\./, '');
  } catch (_) {
    return 'sitio';
  }
}

function crearFilaMeta(icono, texto, titulo) {
  const atributos = titulo ? { title: titulo } : {};
  return crearElemento('li', { clase: 'detalle__meta-item', atributos }, [
    crearIcono(icono),
    crearElemento('span', { texto })
  ]);
}

function crearValorDato(campo, valor) {
  if (campo.tipo === 'numero') {
    return document.createTextNode(formatearDinero(valor));
  }
  if (campo.tipo === 'url' && esEnlaceSeguro(valor)) {
    return crearElemento('a', {
      texto: 'Abrir enlace',
      atributos: { href: valor, target: '_blank', rel: 'noopener noreferrer' }
    });
  }
  return document.createTextNode(String(valor));
}

function construirDatosExtra(propuesta) {
  const lista = crearElemento('dl', { clase: 'detalle__datos' });
  estadoCategoria.campos.forEach((campo) => {
    const valor = propuesta.datos[campo.clave];
    if (CLAVES_DESTACADAS.includes(campo.clave) || valor === undefined || valor === null || valor === '') {
      return;
    }
    lista.appendChild(crearElemento('dt', { texto: campo.etiqueta }));
    lista.appendChild(crearElemento('dd', {}, [crearValorDato(campo, valor)]));
  });
  return lista.childNodes.length > 0 ? lista : null;
}

function crearBotonEnlace(href, icono, texto) {
  return crearElemento('a', {
    clase: 'boton boton--secundario boton--chico',
    atributos: { href, target: '_blank', rel: 'noopener noreferrer' }
  }, [crearIcono(icono), crearElemento('span', { texto })]);
}

function construirAccionesInformacion(propuesta) {
  const acciones = crearElemento('div', { clase: 'detalle__acciones' });
  if (propuesta.datos.enlace && esEnlaceSeguro(propuesta.datos.enlace)) {
    acciones.appendChild(crearBotonEnlace(propuesta.datos.enlace, 'enlace-externo', 'Visitar ' + nombreDeEnlace(propuesta.datos.enlace)));
  }
  return acciones.childNodes.length > 0 ? acciones : null;
}

function crearBotonIcono(icono, etiqueta, variante) {
  return crearElemento('button', {
    clase: 'detalle__icono-boton' + (variante ? ' ' + variante : ''),
    atributos: { type: 'button', 'aria-label': etiqueta, title: etiqueta }
  }, [crearIcono(icono)]);
}

function construirCabecera(propuesta, referencias) {
  const vista = configuracionVista(propuesta.categoriaId);
  const eliminar = crearBotonIcono('papelera', 'Eliminar propuesta', 'detalle__icono-boton--peligro');
  eliminar.hidden = true;
  eliminar.addEventListener('click', eliminarDesdeDetalle);
  referencias.eliminar = eliminar;
  const cerrar = crearBotonIcono('cerrar', 'Cerrar');
  cerrar.addEventListener('click', () => detalleAbierto.modal.close());
  const meta = crearElemento('ul', { clase: 'detalle__meta' });
  if (propuesta.datos.ubicacion) {
    meta.appendChild(crearFilaMeta('ubicacion', propuesta.datos.ubicacion));
  }
  meta.appendChild(crearFilaMeta(
    propuesta.esMia || propuesta.autor ? 'usuario' : 'ojo-oculto',
    textoAutor(propuesta)
  ));
  meta.appendChild(crearFilaMeta('reloj', fechaRelativa(propuesta.fecha), fechaCompleta(propuesta.fecha)));
  const cabecera = crearElemento('header', { clase: 'detalle__cabecera' }, [
    crearElemento('div', { clase: 'detalle__barra' }, [
      crearElemento('p', { clase: 'detalle__categoria' }, [
        crearIcono(vista.icono),
        crearElemento('span', { texto: estadoCategoria.categoria.nombre })
      ]),
      crearElemento('div', { clase: 'detalle__herramientas' }, [eliminar, cerrar])
    ]),
    crearElemento('h2', { clase: 'detalle__titulo', texto: propuesta.titulo, atributos: { id: 'titulo-detalle' } }),
    meta
  ]);
  const acciones = construirAccionesInformacion(propuesta);
  if (acciones) {
    cabecera.appendChild(acciones);
  }
  return cabecera;
}

function construirPestanas(referencias, propuesta) {
  referencias.contador = crearElemento('span', { clase: 'pestana__cuenta', texto: String(propuesta.comentarios || 0) });
  referencias.pestanas = {};
  const lista = crearElemento('div', {
    clase: 'detalle__pestanas',
    atributos: { role: 'tablist', 'aria-label': 'Secciones de la propuesta' }
  });
  PESTANAS_DETALLE.forEach((pestana) => {
    const hijos = [crearIcono(pestana.icono), crearElemento('span', { texto: pestana.etiqueta })];
    if (pestana.clave === 'comentarios') {
      hijos.push(referencias.contador);
    }
    const boton = crearElemento('button', {
      clase: 'detalle__pestana',
      atributos: {
        type: 'button',
        role: 'tab',
        id: 'pestana-detalle-' + pestana.clave,
        'aria-controls': 'panel-detalle-' + pestana.clave
      }
    }, hijos);
    boton.addEventListener('click', () => seleccionarPestanaDetalle(pestana.clave));
    boton.addEventListener('keydown', navegarPestanasDetalle);
    referencias.pestanas[pestana.clave] = boton;
    lista.appendChild(boton);
  });
  return lista;
}

function seleccionarPestanaDetalle(clave) {
  const { pestanas, paneles, lista } = detalleAbierto.referencias;
  PESTANAS_DETALLE.forEach((pestana) => {
    const activa = pestana.clave === clave;
    pestanas[pestana.clave].setAttribute('aria-selected', String(activa));
    pestanas[pestana.clave].tabIndex = activa ? 0 : -1;
    paneles[pestana.clave].hidden = !activa;
  });
  if (clave === 'comentarios') {
    lista.scrollTop = lista.scrollHeight;
  }
}

function navegarPestanasDetalle(evento) {
  if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') {
    return;
  }
  evento.preventDefault();
  const { pestanas } = detalleAbierto.referencias;
  const indice = PESTANAS_DETALLE.findIndex((pestana) => pestanas[pestana.clave] === evento.currentTarget);
  const paso = evento.key === 'ArrowRight' ? 1 : -1;
  const siguiente = PESTANAS_DETALLE[(indice + paso + PESTANAS_DETALLE.length) % PESTANAS_DETALLE.length];
  seleccionarPestanaDetalle(siguiente.clave);
  pestanas[siguiente.clave].focus();
}

function construirPanelInformacion(propuesta) {
  const panel = crearElemento('section', {
    clase: 'detalle__panel detalle__info',
    atributos: { role: 'tabpanel', id: 'panel-detalle-informacion', 'aria-labelledby': 'pestana-detalle-informacion' }
  });
  if (propuesta.datos.nota) {
    panel.appendChild(crearElemento('blockquote', { clase: 'detalle__nota', texto: propuesta.datos.nota }));
  }
  const extra = construirDatosExtra(propuesta);
  if (extra) {
    panel.appendChild(extra);
  }
  if (panel.childNodes.length === 0) {
    panel.appendChild(crearElemento('p', { clase: 'detalle__vacio', texto: 'Esta propuesta no incluye una nota adicional.' }));
  }
  return panel;
}

function construirComentarios(referencias) {
  const maximo = limiteComentario();
  const seccion = crearElemento('section', {
    clase: 'detalle__panel detalle__comentarios',
    atributos: { role: 'tabpanel', id: 'panel-detalle-comentarios', 'aria-labelledby': 'pestana-detalle-comentarios', hidden: '' }
  });
  referencias.lista = crearElemento('div', { clase: 'comentarios', atributos: { 'aria-live': 'polite' } });
  seccion.appendChild(referencias.lista);
  const campo = crearElemento('textarea', {
    atributos: {
      id: 'comentario-texto',
      rows: '2',
      maxlength: String(maximo),
      placeholder: '¿Conoces el lugar? Cuéntanos qué opinas…',
      'aria-label': 'Escribe un comentario'
    }
  });
  const contador = crearContadorTexto(campo, maximo);
  const enviar = crearElemento('button', { clase: 'boton boton--chico', atributos: { type: 'submit' } }, [
    crearIcono('enviar'),
    crearElemento('span', { clase: 'boton__texto', texto: 'Comentar' })
  ]);
  referencias.campo = campo;
  referencias.contadorTexto = contador;
  referencias.enviar = enviar;
  referencias.mensaje = crearCampoMensaje('mensaje-comentario');
  referencias.nota = crearElemento('p', { clase: 'comentar__nota', atributos: { hidden: '' } });
  const formulario = crearElemento('form', { clase: 'comentar' }, [
    campo,
    referencias.mensaje,
    referencias.nota,
    crearElemento('div', { clase: 'comentar__pie' }, [contador, enviar])
  ]);
  campo.addEventListener('input', () => limpiarMensaje(referencias.mensaje));
  campo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      formulario.requestSubmit();
    }
  });
  formulario.addEventListener('submit', enviarComentario);
  referencias.formulario = formulario;
  seccion.appendChild(formulario);
  return seccion;
}

function construirPie(referencias) {
  const selector = crearElemento('select', { atributos: { id: 'detalle-voto' } });
  selector.addEventListener('change', cambiarVoto);
  referencias.selector = selector;
  return crearElemento('footer', { clase: 'detalle__pie' }, [
    crearElemento('div', { clase: 'detalle__voto' }, [
      crearElemento('label', { atributos: { for: 'detalle-voto' } }, [
        crearIcono('estrella'),
        crearElemento('span', { texto: 'Mi voto' })
      ]),
      crearElemento('div', { clase: 'selector selector--voto' }, [selector, crearIcono('flecha-abajo')])
    ])
  ]);
}

function abrirDetalle(propuestaId) {
  const propuesta = buscarPropuesta(propuestaId);
  if (detalleAbierto || !propuesta) {
    return;
  }
  const modal = crearModal('modal--detalle', 'titulo-detalle');
  const referencias = {};
  detalleAbierto = { propuestaId, modal, referencias, comentarios: [], estado: 'cargando', mensajeError: '' };
  const cabecera = construirCabecera(propuesta, referencias);
  const pestanas = construirPestanas(referencias, propuesta);
  referencias.paneles = {
    informacion: construirPanelInformacion(propuesta),
    comentarios: construirComentarios(referencias)
  };
  modal.appendChild(crearElemento('div', { clase: 'detalle' }, [
    cabecera,
    pestanas,
    crearElemento('div', { clase: 'detalle__paneles' }, [referencias.paneles.informacion, referencias.paneles.comentarios]),
    construirPie(referencias)
  ]));
  modal.addEventListener('close', () => {
    detalleAbierto = null;
  });
  abrirModal(modal);
  seleccionarPestanaDetalle('informacion');
  referencias.pestanas.informacion.focus();
  sincronizarDetalle();
  cargarComentarios();
}

function sincronizarDetalle() {
  if (!detalleAbierto) {
    return;
  }
  const propuesta = propuestaDelDetalle();
  if (!propuesta) {
    detalleAbierto.modal.close();
    return;
  }
  actualizarSelectorVoto(propuesta);
  actualizarBotonEliminar(propuesta);
  actualizarCompositor();
}

function crearOpcion(valor, texto) {
  return crearElemento('option', { texto, atributos: { value: valor } });
}

function actualizarSelectorVoto(propuesta) {
  const selector = detalleAbierto.referencias.selector;
  const actual = nivelDeVoto(propuesta.id);
  vaciar(selector);
  selector.appendChild(crearOpcion('', actual === null ? 'Sin voto' : 'Quitar mi voto'));
  NIVELES.forEach((nivel) => {
    const ocupante = propuestaDelNivel(nivel.valor);
    const reemplaza = ocupante && ocupante.id !== propuesta.id ? ' · reemplaza a «' + ocupante.titulo + '»' : '';
    selector.appendChild(crearOpcion(String(nivel.valor), nivel.nombre + reemplaza));
  });
  selector.value = actual === null ? '' : String(actual);
  selector.disabled = categoriaCerrada();
}

function actualizarBotonEliminar(propuesta) {
  const boton = detalleAbierto.referencias.eliminar;
  const permitido = esAdminSesion() || (propuesta.esMia && propuesta.puedeEliminar);
  boton.hidden = !permitido;
}

function actualizarCompositor() {
  const { campo, enviar, nota } = detalleAbierto.referencias;
  const cerrada = categoriaCerrada();
  campo.disabled = cerrada;
  enviar.disabled = cerrada;
  nota.hidden = !cerrada;
  nota.textContent = cerrada ? 'La categoría está cerrada: ya no se pueden agregar comentarios.' : '';
}

async function cambiarVoto(evento) {
  const propuesta = propuestaDelDetalle();
  const selector = evento.target;
  if (!propuesta) {
    return;
  }
  const actual = nivelDeVoto(propuesta.id);
  const valor = selector.value;
  if (valor === '' && actual === null) {
    return;
  }
  selector.disabled = true;
  if (valor === '') {
    await ejecutarAccion('quitarVoto', { nivel: actual }, 'Voto quitado.', { sinSuperposicion: true });
  } else {
    const nivel = Number(valor);
    await ejecutarAccion('votar', { propuestaId: propuesta.id, nivel }, 'Voto guardado como ' + nombreDeNivel(nivel) + '.', { sinSuperposicion: true });
  }
  sincronizarDetalle();
}

async function eliminarDesdeDetalle() {
  const propuesta = propuestaDelDetalle();
  if (!propuesta) {
    return;
  }
  await eliminarPropuesta(propuesta);
}

async function cargarComentarios() {
  const estado = detalleAbierto;
  if (!estado) {
    return;
  }
  estado.estado = 'cargando';
  renderizarComentarios();
  try {
    const datos = await llamarApi('listarComentarios', { propuestaId: estado.propuestaId }, { conSesion: true });
    if (detalleAbierto !== estado) {
      return;
    }
    estado.comentarios = datos.comentarios;
    estado.estado = 'listo';
  } catch (error) {
    if (detalleAbierto !== estado) {
      return;
    }
    estado.estado = 'error';
    estado.mensajeError = error.message;
  }
  renderizarComentarios();
}

function actualizarConteoComentarios() {
  const propuesta = propuestaDelDetalle();
  const total = detalleAbierto.comentarios.length;
  detalleAbierto.referencias.contador.textContent = String(total);
  if (propuesta && propuesta.comentarios !== total && detalleAbierto.estado === 'listo') {
    propuesta.comentarios = total;
    actualizarLista();
  }
}

function crearEsqueletoComentarios() {
  const contenedor = crearElemento('div', { clase: 'comentarios__esqueleto', atributos: { 'aria-hidden': 'true' } });
  [0, 1].forEach(() => {
    contenedor.appendChild(crearElemento('div', { clase: 'comentario-esqueleto' }, [
      crearElemento('span', { clase: 'esqueleto-cat esqueleto-cat--circulo' }),
      crearElemento('div', { clase: 'comentario-esqueleto__texto' }, [
        crearElemento('span', { clase: 'esqueleto-cat esqueleto-cat--corto' }),
        crearElemento('span', { clase: 'esqueleto-cat' })
      ])
    ]));
  });
  return contenedor;
}

function renderizarComentarios() {
  if (!detalleAbierto) {
    return;
  }
  const { lista } = detalleAbierto.referencias;
  vaciar(lista);
  if (detalleAbierto.estado === 'cargando') {
    lista.appendChild(crearEsqueletoComentarios());
    return;
  }
  if (detalleAbierto.estado === 'error') {
    const reintentar = crearElemento('button', { clase: 'boton boton--secundario boton--chico', texto: 'Reintentar', atributos: { type: 'button' } });
    reintentar.addEventListener('click', cargarComentarios);
    lista.appendChild(crearElemento('div', { clase: 'comentarios__vacio' }, [
      crearElemento('p', { texto: detalleAbierto.mensajeError, atributos: { role: 'alert' } }),
      reintentar
    ]));
    return;
  }
  actualizarConteoComentarios();
  if (detalleAbierto.comentarios.length === 0) {
    lista.appendChild(crearElemento('div', { clase: 'comentarios__vacio' }, [
      crearElemento('span', { clase: 'vacio-cat__icono' }, [crearIcono('mensaje')]),
      crearElemento('p', { texto: 'Aún no hay comentarios. Sé la primera persona en comentar.' })
    ]));
    return;
  }
  const hilo = crearElemento('ul', { clase: 'comentarios__lista' });
  detalleAbierto.comentarios.forEach((comentario) => hilo.appendChild(renderizarComentario(comentario)));
  lista.appendChild(hilo);
}

function nombreDeComentario(comentario) {
  if (comentario.esMio) {
    return 'Tú';
  }
  return comentario.autor || 'Anónimo';
}

function renderizarComentario(comentario) {
  const cabecera = crearElemento('div', { clase: 'comentario__cabecera' }, [
    crearElemento('strong', { clase: 'comentario__autor', texto: nombreDeComentario(comentario) })
  ]);
  if (comentario.esAutorPropuesta) {
    cabecera.appendChild(crearElemento('span', { clase: 'chip chip--suave', texto: 'Propone' }));
  }
  if (comentario.anonimo && (comentario.esMio || comentario.autor)) {
    cabecera.appendChild(crearElemento('span', { clase: 'chip chip--suave', texto: 'Anónimo para los demás' }));
  }
  cabecera.appendChild(crearElemento('time', {
    clase: 'comentario__fecha',
    texto: fechaRelativa(comentario.fecha),
    atributos: { datetime: comentario.fecha, title: fechaCompleta(comentario.fecha) }
  }));
  const cuerpo = crearElemento('div', { clase: 'comentario__cuerpo' }, [
    cabecera,
    crearElemento('p', { clase: 'comentario__texto', texto: comentario.texto })
  ]);
  const elemento = crearElemento('li', { clase: 'comentario' + (comentario.esMio ? ' comentario--mio' : '') }, [
    comentario.esMio
      ? crearElemento('span', { clase: 'iniciales iniciales--mia', atributos: { 'aria-hidden': 'true' } }, [crearIcono('usuario')])
      : crearInsigniaIniciales(comentario.autor),
    cuerpo
  ]);
  if (comentario.puedeEliminar) {
    const eliminar = crearElemento('button', {
      clase: 'comentario__eliminar',
      atributos: { type: 'button', 'aria-label': 'Eliminar comentario', title: 'Eliminar comentario' }
    }, [crearIcono('papelera')]);
    eliminar.addEventListener('click', () => eliminarComentario(comentario));
    elemento.appendChild(eliminar);
  }
  return elemento;
}

async function enviarComentario(evento) {
  evento.preventDefault();
  const estado = detalleAbierto;
  const { campo, enviar, mensaje } = estado.referencias;
  const texto = campo.value.trim();
  if (!texto) {
    mostrarMensaje(mensaje, 'Escribe un comentario.');
    return;
  }
  limpiarMensaje(mensaje);
  establecerCargando(enviar, true, 'Enviando…');
  try {
    const datos = await llamarApi('crearComentario', { propuestaId: estado.propuestaId, texto }, { conSesion: true });
    if (detalleAbierto !== estado) {
      return;
    }
    estado.comentarios.push(datos.comentario);
    estado.estado = 'listo';
    campo.value = '';
    estado.referencias.contadorTexto.textContent = '0/' + limiteComentario();
    renderizarComentarios();
    estado.referencias.lista.scrollTop = estado.referencias.lista.scrollHeight;
  } catch (error) {
    if (detalleAbierto === estado) {
      mostrarMensaje(mensaje, error.message);
    }
  } finally {
    establecerCargando(enviar, false);
    if (detalleAbierto === estado) {
      actualizarCompositor();
    }
  }
}

async function eliminarComentario(comentario) {
  const estado = detalleAbierto;
  const confirmado = await confirmarAccion({
    titulo: 'Eliminar comentario',
    mensaje: 'El comentario se eliminará para todas las personas. Esta acción no se puede deshacer.',
    textoConfirmar: 'Eliminar',
    peligro: true
  });
  if (!confirmado || detalleAbierto !== estado) {
    return;
  }
  try {
    await llamarApi('eliminarComentario', { comentarioId: comentario.id }, { conSesion: true });
    estado.comentarios = estado.comentarios.filter((item) => item.id !== comentario.id);
    renderizarComentarios();
    mostrarAviso('Comentario eliminado.');
  } catch (error) {
    mostrarAviso(error.message, true);
  }
}