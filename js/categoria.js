const NIVELES = Object.freeze([
  { valor: 3, nombre: 'Favorita', tono: 'tono-oro' },
  { valor: 2, nombre: 'Alternativa', tono: 'tono-cielo' },
  { valor: 1, nombre: 'Respaldo', tono: 'tono-rosa' }
]);

const PROPUESTAS_POR_PAGINA = 6;

const VISTAS_CATEGORIA = Object.freeze({
  restaurante: {
    icono: 'cubiertos',
    subtitulo: 'Propón lugares, comenta y vota por dónde celebraremos la posada.',
    nombreCampo: 'Nombre del lugar',
    marcadorNombre: 'Ej. La Casa de Toño'
  },
  actividad: {
    icono: 'confeti',
    subtitulo: 'Propón actividades, comenta y vota por la que más te emocione.',
    nombreCampo: 'Nombre de la actividad',
    marcadorNombre: 'Ej. Noche de juegos'
  },
  rifa: {
    icono: 'boleto',
    subtitulo: 'Propón premios, comenta y vota por los que más te gusten.',
    nombreCampo: 'Nombre del premio',
    marcadorNombre: 'Ej. Bocina bluetooth'
  }
});

const VISTA_GENERICA = Object.freeze({
  icono: 'voto',
  subtitulo: 'Propón ideas, comenta y vota.',
  nombreCampo: 'Nombre',
  marcadorNombre: ''
});

const MODOS_FILTRO = Object.freeze([
  { valor: 'todas', etiqueta: 'Todas las propuestas' },
  { valor: 'mias', etiqueta: 'Mis propuestas' },
  { valor: 'votadas', etiqueta: 'Las que voté' },
  { valor: 'sin_voto', etiqueta: 'Sin mi voto' },
  { valor: 'anonimas', etiqueta: 'Anónimas', soloAdmin: true }
]);

const LIMITE_PROPUESTAS_PREDETERMINADO = 3;

let estadoCategoria = null;
let operacionEnCurso = false;
let pestanaActiva = 'propuestas';
let filtrosPropuestas = { texto: '', modo: 'todas', pagina: 1 };
let temporizadorBusqueda = null;
let referenciasFiltros = null;

function categoriaCerrada() {
  return estadoCategoria.categoria.estado !== 'abierta';
}

function configuracionVista(categoriaId) {
  return VISTAS_CATEGORIA[categoriaId] || VISTA_GENERICA;
}

function resultadosDisponibles() {
  return esAdminSesion() || categoriaCerrada();
}

function limitePropuestas() {
  const limites = estadoCategoria.limites;
  return limites && limites.propuestasPorUsuario ? limites.propuestasPorUsuario : LIMITE_PROPUESTAS_PREDETERMINADO;
}

function propuestasUsadas() {
  return estadoCategoria.propuestas.filter((propuesta) => propuesta.esMia).length;
}

function votoDelNivel(nivel) {
  return estadoCategoria.misVotos.find((voto) => voto.nivel === nivel) || null;
}

function nivelDeVoto(propuestaId) {
  const voto = estadoCategoria.misVotos.find((registro) => registro.propuestaId === propuestaId);
  return voto ? voto.nivel : null;
}

function nombreDeNivel(nivel) {
  const encontrado = NIVELES.find((item) => item.valor === nivel);
  return encontrado ? encontrado.nombre : '';
}

function buscarPropuesta(propuestaId) {
  return estadoCategoria.propuestas.find((propuesta) => propuesta.id === propuestaId) || null;
}

function propuestaDelNivel(nivel) {
  const voto = votoDelNivel(nivel);
  return voto ? buscarPropuesta(voto.propuestaId) : null;
}

function textoAutor(propuesta) {
  if (propuesta.esMia) {
    return propuesta.anonima ? 'Tú · tu nombre está oculto' : 'Tú';
  }
  if (!propuesta.autor) {
    return 'Anónimo';
  }
  return propuesta.anonima ? propuesta.autor + ' · nombre oculto' : propuesta.autor;
}

function reiniciarVista() {
  pestanaActiva = 'propuestas';
  filtrosPropuestas = { texto: '', modo: 'todas', pagina: 1 };
}

async function cargarCategoria(categoriaId, conservarVista = false) {
  const contenido = document.getElementById('contenido');
  try {
    const datos = await llamarApi('listarPropuestas', { categoriaId }, { conSesion: true });
    if (categoriaId !== categoriaActivaId) {
      return;
    }
    if (!conservarVista) {
      reiniciarVista();
    }
    estadoCategoria = datos;
    renderizarCategoria();
  } catch (error) {
    if (categoriaId !== categoriaActivaId) {
      return;
    }
    mostrarErrorCategoria(contenido, categoriaId, error.message);
  }
}

function mostrarErrorCategoria(contenido, categoriaId, mensaje) {
  vaciar(contenido);
  const reintentar = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    texto: 'Reintentar',
    atributos: { type: 'button' }
  });
  reintentar.addEventListener('click', () => cargarCategoria(categoriaId));
  contenido.appendChild(crearElemento('div', { clase: 'vacio-cat' }, [
    crearElemento('span', { clase: 'vacio-cat__icono vacio-cat__icono--alerta' }, [crearIcono('alerta')]),
    crearElemento('p', { clase: 'vacio-cat__titulo', texto: 'No se pudo cargar la categoría' }),
    crearElemento('p', { clase: 'vacio-cat__texto', texto: mensaje, atributos: { role: 'alert' } }),
    reintentar
  ]));
}

function pestanasDisponibles() {
  const lista = [{ id: 'propuestas', etiqueta: 'Propuestas', icono: 'lista' }];
  if (resultadosDisponibles()) {
    lista.push({ id: 'resultados', etiqueta: 'Resultados', icono: 'grafica' });
  }
  if (esAdminSesion()) {
    lista.push({ id: 'administracion', etiqueta: 'Administración', icono: 'panel' });
  }
  return lista;
}

function renderizarCategoria() {
  const contenido = document.getElementById('contenido');
  vaciar(contenido);
  if (!pestanasDisponibles().some((pestana) => pestana.id === pestanaActiva)) {
    pestanaActiva = 'propuestas';
  }
  const vista = crearElemento('section', {
    clase: 'vista-cat',
    atributos: { 'aria-label': estadoCategoria.categoria.nombre }
  });
  const conPestanas = pestanasDisponibles().length > 1;
  vista.appendChild(renderizarEncabezado());
  if (conPestanas) {
    vista.appendChild(renderizarPestanas());
  }
  vista.appendChild(crearPanel('propuestas', renderizarPanelPropuestas(), conPestanas));
  if (resultadosDisponibles()) {
    vista.appendChild(crearPanel('resultados', null, conPestanas));
  }
  if (esAdminSesion()) {
    vista.appendChild(crearPanel('administracion', renderizarAdministracion(), conPestanas));
  }
  contenido.appendChild(vista);
  actualizarLista();
  activarPestana(pestanaActiva, false);
  sincronizarDetalle();
}

function crearPanel(id, contenido, conPestanas) {
  const atributos = conPestanas
    ? { id: 'panel-' + id, role: 'tabpanel', 'aria-labelledby': 'pestana-' + id, tabindex: '0' }
    : { id: 'panel-' + id };
  const panel = crearElemento('div', { clase: 'panel-cat', atributos });
  if (contenido) {
    panel.appendChild(contenido);
  }
  return panel;
}

function renderizarEncabezado() {
  const categoria = estadoCategoria.categoria;
  const vista = configuracionVista(categoria.id);
  const cabecera = crearElemento('header', { clase: 'cabecera-cat' });
  cabecera.appendChild(crearElemento('div', { clase: 'cabecera-cat__fila' }, [
    crearElemento('span', { clase: 'cabecera-cat__icono' }, [crearIcono(vista.icono)]),
    crearElemento('h2', { clase: 'cabecera-cat__titulo', texto: categoria.nombre }),
    crearElemento('span', { clase: 'cabecera-cat__linea', atributos: { 'aria-hidden': 'true' } }),
    renderizarAccionNueva()
  ]));
  cabecera.appendChild(crearElemento('p', { clase: 'cabecera-cat__subtitulo', texto: vista.subtitulo }));
  const reglas = renderizarReglas();
  if (reglas) {
    cabecera.appendChild(reglas);
  }
  return cabecera;
}

function renderizarAccionNueva() {
  const usadas = propuestasUsadas();
  const maximo = limitePropuestas();
  const agotado = usadas >= maximo;
  const cerrada = categoriaCerrada();
  const accion = crearElemento('div', { clase: 'cabecera-cat__accion' });
  if (cerrada) {
    accion.appendChild(crearElemento('span', { clase: 'insignia insignia--cerrada', texto: 'Categoría cerrada' }));
  } else {
    accion.appendChild(crearElemento('span', {
      clase: 'cabecera-cat__cupo',
      texto: (agotado ? 'Límite alcanzado · ' : '') + usadas + ' de ' + maximo + ' propuestas',
      atributos: { id: 'cupo-propuestas' }
    }));
  }
  const boton = crearElemento('button', {
    clase: 'boton boton--chico boton-nueva',
    atributos: { type: 'button', 'aria-describedby': 'cupo-propuestas' }
  }, [crearIcono('mas'), crearElemento('span', { texto: 'Nueva propuesta' })]);
  boton.disabled = cerrada || agotado;
  if (agotado && !cerrada) {
    boton.title = 'Ya llegaste al máximo de propuestas en esta categoría.';
  }
  boton.addEventListener('click', () => abrirFormulario(estadoCategoria));
  accion.appendChild(boton);
  return accion;
}

function renderizarReglas() {
  const categoria = estadoCategoria.categoria;
  const reglas = [];
  if (categoria.presupuesto !== '' && categoria.presupuesto !== null) {
    reglas.push('Presupuesto máximo: ' + formatearDinero(categoria.presupuesto));
  }
  if (categoria.requisitos) {
    reglas.push('Requisitos: ' + categoria.requisitos);
  }
  if (reglas.length === 0) {
    return null;
  }
  const lista = crearElemento('ul', { clase: 'reglas-cat' });
  reglas.forEach((regla) => lista.appendChild(crearElemento('li', { clase: 'reglas-cat__item', texto: regla })));
  return lista;
}

function renderizarPestanas() {
  const barra = crearElemento('div', {
    clase: 'pestanas',
    atributos: { role: 'tablist', 'aria-label': 'Secciones de ' + estadoCategoria.categoria.nombre }
  });
  pestanasDisponibles().forEach((pestana) => {
    const hijos = [crearIcono(pestana.icono), crearElemento('span', { texto: pestana.etiqueta })];
    if (pestana.id === 'propuestas') {
      hijos.push(crearElemento('span', { clase: 'pestana__cuenta', texto: String(estadoCategoria.propuestas.length) }));
    }
    const boton = crearElemento('button', {
      clase: 'pestana',
      atributos: { type: 'button', role: 'tab', id: 'pestana-' + pestana.id, 'aria-controls': 'panel-' + pestana.id, 'data-pestana': pestana.id }
    }, hijos);
    boton.addEventListener('click', () => activarPestana(pestana.id, false));
    boton.addEventListener('keydown', manejarTeclasPestanas);
    barra.appendChild(boton);
  });
  return barra;
}

function manejarTeclasPestanas(evento) {
  const ids = pestanasDisponibles().map((pestana) => pestana.id);
  const indice = ids.indexOf(pestanaActiva);
  let destino = null;
  if (evento.key === 'ArrowRight') {
    destino = ids[(indice + 1) % ids.length];
  } else if (evento.key === 'ArrowLeft') {
    destino = ids[(indice - 1 + ids.length) % ids.length];
  } else if (evento.key === 'Home') {
    destino = ids[0];
  } else if (evento.key === 'End') {
    destino = ids[ids.length - 1];
  }
  if (destino) {
    evento.preventDefault();
    activarPestana(destino, true);
  }
}

function activarPestana(id, enfocar) {
  pestanaActiva = id;
  document.querySelectorAll('.pestana').forEach((boton) => {
    const activa = boton.dataset.pestana === id;
    boton.setAttribute('aria-selected', String(activa));
    boton.tabIndex = activa ? 0 : -1;
    if (activa && enfocar) {
      boton.focus();
    }
  });
  document.querySelectorAll('.panel-cat').forEach((panel) => {
    panel.hidden = panel.id !== 'panel-' + id;
  });
  if (id === 'resultados') {
    mostrarResultados(estadoCategoria.categoria.id);
  }
}

function renderizarPanelPropuestas() {
  const contenedor = crearElemento('div', { clase: 'panel-cat__contenido' });
  contenedor.appendChild(renderizarMisVotos());
  contenedor.appendChild(renderizarFiltros());
  contenedor.appendChild(crearElemento('div', {
    clase: 'lista-region',
    atributos: { id: 'lista-propuestas', 'aria-live': 'polite' }
  }));
  return contenedor;
}

function renderizarMisVotos() {
  const seccion = crearElemento('section', { clase: 'mis-votos', atributos: { 'aria-label': 'Mis votos' } });
  seccion.appendChild(crearElemento('div', { clase: 'seccion-titulo' }, [
    crearElemento('h3', { texto: 'Mis votos' }),
    crearElemento('p', {
      texto: categoriaCerrada()
        ? 'La votación terminó.'
        : 'Un voto por nivel. Puedes cambiarlos mientras la categoría esté abierta.'
    })
  ]));
  const rejilla = crearElemento('div', { clase: 'mis-votos__rejilla' });
  NIVELES.forEach((nivel) => rejilla.appendChild(renderizarCasillaVoto(nivel)));
  seccion.appendChild(rejilla);
  return seccion;
}

function renderizarCasillaVoto(nivel) {
  const propuesta = propuestaDelNivel(nivel.valor);
  const casilla = crearElemento('article', {
    clase: 'voto-casilla ' + nivel.tono + (propuesta ? '' : ' voto-casilla--vacia')
  });
  casilla.appendChild(crearElemento('p', { clase: 'voto-casilla__nivel' }, [
    crearIcono('estrella'),
    crearElemento('span', { texto: nivel.nombre }),
    crearElemento('span', { clase: 'voto-casilla__puntos', texto: pluralizar(nivel.valor, 'punto', 'puntos') })
  ]));
  if (!propuesta) {
    casilla.appendChild(crearElemento('p', { clase: 'voto-casilla__vacio', texto: 'Elige una propuesta de la lista' }));
    return casilla;
  }
  casilla.appendChild(crearElemento('p', { clase: 'voto-casilla__nombre', texto: propuesta.titulo, atributos: { title: propuesta.titulo } }));
  const acciones = crearElemento('div', { clase: 'voto-casilla__acciones' });
  const detalles = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    atributos: { type: 'button', 'aria-label': 'Ver detalles de ' + propuesta.titulo }
  }, [crearIcono('ojo'), crearElemento('span', { texto: 'Ver detalles' })]);
  detalles.addEventListener('click', () => abrirDetalle(propuesta.id));
  acciones.appendChild(detalles);
  if (!categoriaCerrada()) {
    const quitar = crearElemento('button', {
      clase: 'boton boton--fantasma boton--chico',
      atributos: { type: 'button', 'aria-label': 'Quitar voto ' + nivel.nombre }
    }, [crearIcono('cerrar'), crearElemento('span', { texto: 'Quitar' })]);
    quitar.addEventListener('click', () => quitarVotoDeNivel(nivel.valor));
    acciones.appendChild(quitar);
  }
  casilla.appendChild(acciones);
  return casilla;
}

function renderizarFiltros() {
  const formulario = crearElemento('form', {
    clase: 'filtros',
    atributos: { role: 'search', 'aria-label': 'Buscar y filtrar propuestas' }
  });
  const entrada = crearElemento('input', {
    atributos: {
      id: 'filtro-busqueda',
      type: 'search',
      placeholder: 'Buscar por nombre o por persona',
      autocomplete: 'off',
      maxlength: '80',
      'aria-label': 'Buscar por nombre de la propuesta o de la persona'
    }
  });
  entrada.value = filtrosPropuestas.texto;
  entrada.addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(() => {
      filtrosPropuestas.texto = entrada.value;
      filtrosPropuestas.pagina = 1;
      actualizarLista();
    }, 150);
  });
  const buscador = crearElemento('label', { clase: 'buscador', atributos: { for: 'filtro-busqueda' } }, [
    crearIcono('buscar'),
    entrada
  ]);
  const selector = crearElemento('select', { atributos: { id: 'filtro-modo', 'aria-label': 'Mostrar' } });
  MODOS_FILTRO.filter((modo) => !modo.soloAdmin || esAdminSesion()).forEach((modo) => {
    selector.appendChild(crearElemento('option', { texto: modo.etiqueta, atributos: { value: modo.valor } }));
  });
  selector.value = filtrosPropuestas.modo;
  selector.addEventListener('change', () => {
    filtrosPropuestas.modo = selector.value;
    filtrosPropuestas.pagina = 1;
    actualizarLista();
  });
  const limpiar = crearElemento('button', {
    clase: 'boton boton--fantasma boton--chico',
    atributos: { type: 'button', hidden: '' }
  }, [crearIcono('cerrar'), crearElemento('span', { texto: 'Limpiar' })]);
  limpiar.addEventListener('click', limpiarFiltros);
  formulario.addEventListener('submit', (evento) => evento.preventDefault());
  formulario.appendChild(buscador);
  formulario.appendChild(crearElemento('div', { clase: 'selector' }, [
    crearElemento('span', { clase: 'selector__etiqueta', texto: 'Mostrar' }),
    selector,
    crearIcono('flecha-abajo')
  ]));
  formulario.appendChild(limpiar);
  referenciasFiltros = { entrada, selector, limpiar };
  return formulario;
}

function hayFiltrosActivos() {
  return filtrosPropuestas.texto.trim() !== '' || filtrosPropuestas.modo !== 'todas';
}

function limpiarFiltros() {
  filtrosPropuestas = { texto: '', modo: 'todas', pagina: 1 };
  if (referenciasFiltros) {
    referenciasFiltros.entrada.value = '';
    referenciasFiltros.selector.value = 'todas';
    referenciasFiltros.entrada.focus();
  }
  actualizarLista();
}

function propuestasFiltradas() {
  const busqueda = normalizarBusqueda(filtrosPropuestas.texto);
  return estadoCategoria.propuestas.filter((propuesta) => {
    if (busqueda) {
      const coincide = normalizarBusqueda(propuesta.titulo).includes(busqueda)
        || normalizarBusqueda(propuesta.autor).includes(busqueda);
      if (!coincide) {
        return false;
      }
    }
    switch (filtrosPropuestas.modo) {
      case 'mias':
        return propuesta.esMia;
      case 'votadas':
        return nivelDeVoto(propuesta.id) !== null;
      case 'sin_voto':
        return nivelDeVoto(propuesta.id) === null;
      case 'anonimas':
        return propuesta.anonima;
      default:
        return true;
    }
  });
}

function actualizarLista() {
  const region = document.getElementById('lista-propuestas');
  if (!region) {
    return;
  }
  vaciar(region);
  if (referenciasFiltros) {
    referenciasFiltros.limpiar.hidden = !hayFiltrosActivos();
  }
  if (estadoCategoria.propuestas.length === 0) {
    region.appendChild(renderizarSinPropuestas());
    return;
  }
  const filtradas = propuestasFiltradas();
  if (filtradas.length === 0) {
    region.appendChild(renderizarSinResultados());
    return;
  }
  const totalPaginas = Math.ceil(filtradas.length / PROPUESTAS_POR_PAGINA);
  filtrosPropuestas.pagina = Math.min(Math.max(filtrosPropuestas.pagina, 1), totalPaginas);
  const inicio = (filtrosPropuestas.pagina - 1) * PROPUESTAS_POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + PROPUESTAS_POR_PAGINA);
  region.appendChild(crearElemento('p', {
    clase: 'lista-resumen',
    texto: 'Mostrando ' + (inicio + 1) + '–' + (inicio + visibles.length) + ' de ' + pluralizar(filtradas.length, 'propuesta', 'propuestas')
  }));
  const lista = crearElemento('ul', { clase: 'lista-prop' });
  visibles.forEach((propuesta) => lista.appendChild(renderizarFila(propuesta)));
  region.appendChild(lista);
  if (totalPaginas > 1) {
    region.appendChild(renderizarPaginacion(totalPaginas));
  }
}

function renderizarSinPropuestas() {
  const vacio = crearElemento('div', { clase: 'vacio-cat' }, [
    crearElemento('span', { clase: 'vacio-cat__icono' }, [crearIcono(configuracionVista(estadoCategoria.categoria.id).icono)]),
    crearElemento('p', { clase: 'vacio-cat__titulo', texto: 'Aún no hay propuestas' }),
    crearElemento('p', {
      clase: 'vacio-cat__texto',
      texto: categoriaCerrada() ? 'Esta categoría se cerró sin propuestas.' : 'Sé la primera persona en proponer.'
    })
  ]);
  if (!categoriaCerrada()) {
    const nueva = crearElemento('button', { clase: 'boton boton--chico', atributos: { type: 'button' } }, [
      crearIcono('mas'),
      crearElemento('span', { texto: 'Nueva propuesta' })
    ]);
    nueva.addEventListener('click', () => abrirFormulario(estadoCategoria));
    vacio.appendChild(nueva);
  }
  return vacio;
}

function renderizarSinResultados() {
  const limpiar = crearElemento('button', { clase: 'boton boton--secundario boton--chico', atributos: { type: 'button' } }, [
    crearIcono('cerrar'),
    crearElemento('span', { texto: 'Limpiar filtros' })
  ]);
  limpiar.addEventListener('click', limpiarFiltros);
  return crearElemento('div', { clase: 'vacio-cat' }, [
    crearElemento('span', { clase: 'vacio-cat__icono' }, [crearIcono('buscar')]),
    crearElemento('p', { clase: 'vacio-cat__titulo', texto: 'Sin resultados' }),
    crearElemento('p', { clase: 'vacio-cat__texto', texto: 'Ninguna propuesta coincide con tu búsqueda.' }),
    limpiar
  ]);
}

function crearChip(clase, icono, texto, ayuda) {
  const atributos = ayuda ? { title: ayuda } : {};
  return crearElemento('span', { clase: 'chip ' + clase, atributos }, [
    crearIcono(icono),
    crearElemento('span', { texto })
  ]);
}

function crearAvatarFila(propuesta) {
  if (propuesta.esMia) {
    return crearElemento('span', { clase: 'iniciales iniciales--mia', atributos: { 'aria-hidden': 'true' } }, [crearIcono('usuario')]);
  }
  return crearInsigniaIniciales(propuesta.autor);
}

function renderizarFila(propuesta) {
  const nivel = nivelDeVoto(propuesta.id);
  const fila = crearElemento('li', { clase: 'fila-prop' + (propuesta.esMia ? ' fila-prop--mia' : '') });
  fila.appendChild(crearAvatarFila(propuesta));
  fila.appendChild(crearElemento('div', { clase: 'fila-prop__principal' }, [
    crearElemento('h4', { clase: 'fila-prop__titulo', texto: propuesta.titulo }),
    crearElemento('p', { clase: 'fila-prop__autor', texto: textoAutor(propuesta) })
  ]));
  const datos = crearElemento('div', { clase: 'fila-prop__datos' });
  if (nivel !== null) {
    const insignia = NIVELES.find((item) => item.valor === nivel);
    datos.appendChild(crearChip('chip--nivel ' + insignia.tono, 'estrella', 'Tu voto: ' + insignia.nombre));
  }
  if (propuesta.votos !== null && propuesta.votos !== undefined) {
    datos.appendChild(crearChip('', 'tendencia', pluralizar(propuesta.votos, 'voto', 'votos'), pluralizar(propuesta.puntos, 'punto', 'puntos') + ' en total'));
  }
  datos.appendChild(crearChip('', 'mensaje', pluralizar(propuesta.comentarios || 0, 'comentario', 'comentarios')));
  fila.appendChild(datos);
  fila.appendChild(renderizarAccionesFila(propuesta));
  return fila;
}

function renderizarAccionesFila(propuesta) {
  const acciones = crearElemento('div', { clase: 'fila-prop__acciones' });
  const detalles = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    atributos: { type: 'button', 'aria-label': 'Ver detalles de ' + propuesta.titulo }
  }, [crearIcono('ojo'), crearElemento('span', { texto: 'Detalles' })]);
  detalles.addEventListener('click', () => abrirDetalle(propuesta.id));
  acciones.appendChild(detalles);
  if (propuesta.esMia) {
    const eliminar = crearElemento('button', {
      clase: 'boton boton--peligro-suave boton--chico',
      atributos: { type: 'button', 'aria-label': 'Eliminar ' + propuesta.titulo }
    }, [crearIcono('papelera'), crearElemento('span', { texto: 'Eliminar' })]);
    eliminar.disabled = !propuesta.puedeEliminar;
    if (!propuesta.puedeEliminar) {
      eliminar.title = categoriaCerrada() ? 'La categoría está cerrada.' : 'Otras personas ya votaron por esta propuesta.';
    }
    eliminar.addEventListener('click', () => eliminarPropuesta(propuesta));
    acciones.appendChild(eliminar);
  }
  return acciones;
}

function numerosDePagina(actual, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, indice) => indice + 1);
  }
  const ordenadas = Array.from(new Set([1, total, actual - 1, actual, actual + 1]))
    .filter((numero) => numero >= 1 && numero <= total)
    .sort((a, b) => a - b);
  const resultado = [];
  ordenadas.forEach((numero, indice) => {
    if (indice > 0 && numero - ordenadas[indice - 1] > 1) {
      resultado.push(0);
    }
    resultado.push(numero);
  });
  return resultado;
}

function irAPagina(pagina) {
  filtrosPropuestas.pagina = pagina;
  actualizarLista();
  const region = document.getElementById('lista-propuestas');
  if (region) {
    region.scrollIntoView({ block: 'start' });
  }
}

function crearBotonPagina(contenido, etiqueta, pagina, deshabilitado) {
  const boton = crearElemento('button', {
    clase: 'paginacion__boton',
    atributos: { type: 'button', 'aria-label': etiqueta }
  }, contenido);
  boton.disabled = deshabilitado;
  boton.addEventListener('click', () => irAPagina(pagina));
  return boton;
}

function renderizarPaginacion(totalPaginas) {
  const actual = filtrosPropuestas.pagina;
  const navegacion = crearElemento('nav', { clase: 'paginacion', atributos: { 'aria-label': 'Paginación de propuestas' } });
  navegacion.appendChild(crearBotonPagina([crearIcono('flecha-izquierda')], 'Página anterior', actual - 1, actual === 1));
  const numeros = crearElemento('div', { clase: 'paginacion__numeros' });
  numerosDePagina(actual, totalPaginas).forEach((numero) => {
    if (numero === 0) {
      numeros.appendChild(crearElemento('span', { clase: 'paginacion__puntos', texto: '…', atributos: { 'aria-hidden': 'true' } }));
      return;
    }
    const boton = crearBotonPagina([document.createTextNode(String(numero))], 'Página ' + numero, numero, false);
    if (numero === actual) {
      boton.setAttribute('aria-current', 'page');
      boton.classList.add('paginacion__boton--activa');
    }
    numeros.appendChild(boton);
  });
  navegacion.appendChild(numeros);
  navegacion.appendChild(crearElemento('span', { clase: 'paginacion__estado', texto: actual + ' / ' + totalPaginas }));
  navegacion.appendChild(crearBotonPagina([crearIcono('flecha-derecha')], 'Página siguiente', actual + 1, actual === totalPaginas));
  return navegacion;
}

async function ejecutarAccion(accion, datos, mensajeExito, opciones = {}) {
  if (operacionEnCurso) {
    return false;
  }
  operacionEnCurso = true;
  const contenido = document.getElementById('contenido');
  const categoriaId = estadoCategoria.categoria.id;
  if (!opciones.sinSuperposicion) {
    contenido.classList.add('ocupado');
  }
  let correcto = false;
  try {
    await llamarApi(accion, { categoriaId, ...datos }, { conSesion: true });
    correcto = true;
    if (mensajeExito) {
      mostrarAviso(mensajeExito);
    }
  } catch (error) {
    mostrarAviso(error.message, true);
  }
  try {
    await cargarCategoria(categoriaId, true);
  } finally {
    contenido.classList.remove('ocupado');
    operacionEnCurso = false;
  }
  return correcto;
}

function quitarVotoDeNivel(nivel) {
  return ejecutarAccion('quitarVoto', { nivel }, 'Voto quitado.');
}

async function eliminarPropuesta(propuesta) {
  const adicional = esAdminSesion() && !propuesta.esMia ? ' También se quitarán los votos que haya recibido.' : '';
  const confirmado = await confirmarAccion({
    titulo: 'Eliminar propuesta',
    mensaje: '«' + propuesta.titulo + '» se eliminará junto con sus comentarios.' + adicional + ' Esta acción no se puede deshacer.',
    textoConfirmar: 'Eliminar',
    peligro: true
  });
  if (!confirmado) {
    return false;
  }
  return ejecutarAccion('eliminarPropuesta', { propuestaId: propuesta.id }, 'Propuesta eliminada.');
}