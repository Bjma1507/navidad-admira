const NIVELES = Object.freeze([
  { valor: 3, nombre: 'Favorita' },
  { valor: 2, nombre: 'Alternativa' },
  { valor: 1, nombre: 'Respaldo' }
]);

let estadoCategoria = null;
let operacionEnCurso = false;

function categoriaCerrada() {
  return estadoCategoria.categoria.estado !== 'abierta';
}

function votoDelNivel(nivel) {
  return estadoCategoria.misVotos.find((voto) => voto.nivel === nivel) || null;
}

function propuestaDelNivel(nivel) {
  const voto = votoDelNivel(nivel);
  if (!voto) {
    return null;
  }
  return estadoCategoria.propuestas.find((p) => p.id === voto.propuestaId) || null;
}

async function cargarCategoria(categoriaId) {
  const contenido = document.getElementById('contenido');
  try {
    const datos = await llamarApi('listarPropuestas', { categoriaId }, { conSesion: true });
    if (categoriaId !== categoriaActivaId) {
      return;
    }
    estadoCategoria = datos;
    renderizarCategoria();
    mostrarResultados(categoriaId);
  } catch (error) {
    if (categoriaId !== categoriaActivaId) {
      return;
    }
    vaciar(contenido);
    contenido.appendChild(crearElemento('p', { clase: 'mensaje', texto: error.message, atributos: { role: 'alert' } }));
  }
}

function renderizarCategoria() {
  const contenido = document.getElementById('contenido');
  vaciar(contenido);
  contenido.appendChild(renderizarEncabezado());
  contenido.appendChild(renderizarMisVotos());
  contenido.appendChild(renderizarListado());
  contenido.appendChild(crearContenedorResultados());
  if (esAdminSesion()) {
    contenido.appendChild(renderizarAdministracion());
  }
}

function renderizarEncabezado() {
  const categoria = estadoCategoria.categoria;
  const cabecera = crearElemento('header', { clase: 'categoria__cabecera' });
  cabecera.appendChild(crearElemento('h2', { texto: categoria.nombre }));
  if (categoriaCerrada()) {
    cabecera.appendChild(crearElemento('p', { clase: 'etiqueta etiqueta--cerrada', texto: 'Categoría cerrada' }));
  }
  if (categoria.presupuesto !== '' && categoria.presupuesto !== null) {
    cabecera.appendChild(crearElemento('p', { clase: 'categoria__dato', texto: 'Presupuesto máximo: ' + formatearDinero(categoria.presupuesto) }));
  }
  if (categoria.requisitos) {
    cabecera.appendChild(crearElemento('p', { clase: 'categoria__dato', texto: 'Requisitos: ' + categoria.requisitos }));
  }
  const nueva = crearElemento('button', { clase: 'boton boton--chico', texto: 'Nueva propuesta', atributos: { type: 'button' } });
  nueva.disabled = categoriaCerrada();
  nueva.addEventListener('click', () => abrirFormulario(estadoCategoria));
  cabecera.appendChild(nueva);
  return cabecera;
}

function renderizarMisVotos() {
  const seccion = crearElemento('section', { clase: 'votos', atributos: { 'aria-label': 'Mis votos' } });
  seccion.appendChild(crearElemento('h3', { texto: 'Mis votos' }));
  const rejilla = crearElemento('div', { clase: 'votos__rejilla' });
  NIVELES.forEach((nivel) => {
    const propuesta = propuestaDelNivel(nivel.valor);
    const casilla = crearElemento('div', { clase: 'votos__casilla' });
    casilla.appendChild(crearElemento('p', { clase: 'votos__nivel', texto: nivel.nombre }));
    casilla.appendChild(crearElemento('p', { clase: 'votos__elegida', texto: propuesta ? propuesta.titulo : 'Sin elegir' }));
    if (propuesta && !categoriaCerrada()) {
      const quitar = crearElemento('button', {
        clase: 'boton boton--secundario boton--chico',
        texto: 'Quitar',
        atributos: { type: 'button', 'aria-label': 'Quitar voto ' + nivel.nombre }
      });
      quitar.addEventListener('click', () => quitarVotoDeNivel(nivel.valor));
      casilla.appendChild(quitar);
    }
    rejilla.appendChild(casilla);
  });
  seccion.appendChild(rejilla);
  return seccion;
}

function renderizarListado() {
  const propuestas = estadoCategoria.propuestas;
  const seccion = crearElemento('section', { clase: 'propuestas', atributos: { 'aria-label': 'Propuestas' } });
  seccion.appendChild(crearElemento('h3', { texto: 'Propuestas (' + propuestas.length + ')' }));
  if (propuestas.length === 0) {
    seccion.appendChild(crearElemento('p', { clase: 'categoria__dato', texto: 'Aún no hay propuestas. Sé la primera persona en proponer.' }));
    return seccion;
  }
  const rejilla = crearElemento('div', { clase: 'propuestas__rejilla' });
  propuestas.forEach((propuesta) => rejilla.appendChild(renderizarPropuesta(propuesta)));
  seccion.appendChild(rejilla);
  return seccion;
}

function renderizarPropuesta(propuesta) {
  const tarjeta = crearElemento('article', { clase: 'tarjeta' });
  tarjeta.appendChild(crearElemento('h4', { texto: propuesta.titulo }));
  tarjeta.appendChild(crearElemento('p', { clase: 'tarjeta__autor', texto: textoAutor(propuesta) }));
  tarjeta.appendChild(renderizarDatos(propuesta));
  tarjeta.appendChild(renderizarBotonesVoto(propuesta));
  return tarjeta;
}

function textoAutor(propuesta) {
  if (!propuesta.autor) {
    return 'Propuesta anónima';
  }
  return 'Propone: ' + propuesta.autor + (propuesta.anonima ? ' (anónima para el resto)' : '');
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

function renderizarDatos(propuesta) {
  const lista = crearElemento('dl', { clase: 'tarjeta__datos' });
  estadoCategoria.campos.forEach((campo) => {
    const valor = propuesta.datos[campo.clave];
    if (valor === undefined || valor === null || valor === '') {
      return;
    }
    lista.appendChild(crearElemento('dt', { texto: campo.etiqueta }));
    lista.appendChild(crearElemento('dd', {}, [crearValorDato(campo, valor)]));
  });
  return lista;
}

function renderizarBotonesVoto(propuesta) {
  const grupo = crearElemento('div', {
    clase: 'tarjeta__votos',
    atributos: { role: 'group', 'aria-label': 'Votar por ' + propuesta.titulo }
  });
  NIVELES.forEach((nivel) => {
    const voto = votoDelNivel(nivel.valor);
    const elegido = Boolean(voto && voto.propuestaId === propuesta.id);
    const boton = crearElemento('button', {
      clase: 'boton-voto',
      texto: nivel.nombre,
      atributos: { type: 'button', 'aria-pressed': String(elegido) }
    });
    boton.disabled = categoriaCerrada();
    boton.addEventListener('click', () => {
      if (elegido) {
        quitarVotoDeNivel(nivel.valor);
      } else {
        votarPropuesta(propuesta.id, nivel.valor);
      }
    });
    grupo.appendChild(boton);
  });
  return grupo;
}

async function ejecutarAccion(accion, datos, mensajeExito) {
  if (operacionEnCurso) {
    return;
  }
  operacionEnCurso = true;
  const contenido = document.getElementById('contenido');
  const categoriaId = estadoCategoria.categoria.id;
  contenido.classList.add('ocupado');
  try {
    await llamarApi(accion, { categoriaId, ...datos }, { conSesion: true });
    if (mensajeExito) {
      mostrarAviso(mensajeExito);
    }
  } catch (error) {
    mostrarAviso(error.message, true);
  }
  try {
    await cargarCategoria(categoriaId);
  } finally {
    contenido.classList.remove('ocupado');
    operacionEnCurso = false;
  }
}

function votarPropuesta(propuestaId, nivel) {
  return ejecutarAccion('votar', { propuestaId, nivel });
}

function quitarVotoDeNivel(nivel) {
  return ejecutarAccion('quitarVoto', { nivel });
}