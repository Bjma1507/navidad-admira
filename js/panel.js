let categorias = [];
let categoriaActivaId = null;
let vistaActiva = null;

const CLAVE_MENU = 'navidad-admira-menu';
const consultaEscritorio = window.matchMedia('(min-width: 1024px)');

function primerNombre(nombre) {
  return String(nombre).trim().split(/\s+/)[0] || '';
}

function iniciales(nombre) {
  return String(nombre)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

function leerMenuGuardado() {
  try {
    return localStorage.getItem(CLAVE_MENU);
  } catch (_) {
    return null;
  }
}

function guardarMenu(valor) {
  try {
    localStorage.setItem(CLAVE_MENU, valor);
  } catch (_) {
    return;
  }
}

function aplicarMenu() {
  const aplicacion = document.getElementById('app');
  const contraido = consultaEscritorio.matches ? leerMenuGuardado() === 'contraido' : true;
  aplicacion.dataset.menu = contraido ? 'contraido' : 'abierto';
  const boton = document.getElementById('boton-menu');
  boton.setAttribute('aria-expanded', String(!contraido));
  boton.setAttribute('aria-label', contraido ? 'Expandir menú' : 'Contraer menú');
}

function alternarMenu() {
  const contraido = document.getElementById('app').dataset.menu === 'contraido';
  guardarMenu(contraido ? 'abierto' : 'contraido');
  aplicarMenu();
}

function obtenerEntradasMenu() {
  const entradas = [];
  if (esAdminSesion()) {
    entradas.push({
      grupo: 'Principal',
      vista: 'dashboard',
      texto: 'Dashboard',
      icono: 'tablero',
      alSeleccionar: () => seleccionarDashboard(true)
    });
  }
  categorias.forEach((categoria) => {
    entradas.push({
      grupo: 'Categorías',
      vista: categoria.id,
      texto: categoria.nombre,
      icono: iconoDeCategoria(categoria.nombre),
      alSeleccionar: () => seleccionarCategoria(categoria.id, true)
    });
  });
  if (esAdminSesion()) {
    entradas.push({
      grupo: 'Administración',
      vista: 'usuarios',
      texto: 'Usuarios',
      icono: 'usuarios',
      alSeleccionar: () => seleccionarUsuarios(true)
    });
  }
  return entradas;
}

function crearBotonNavegacion(bloque, entrada, etiqueta) {
  const boton = crearElemento('button', {
    clase: bloque + '__boton',
    atributos: {
      type: 'button',
      'data-vista': String(entrada.vista),
      'aria-label': entrada.texto,
      title: entrada.texto
    }
  }, [
    crearIcono(entrada.icono),
    crearElemento('span', { clase: bloque + '__texto', texto: etiqueta })
  ]);
  boton.addEventListener('click', entrada.alSeleccionar);
  return boton;
}

function agruparEntradas(entradas) {
  const grupos = [];
  entradas.forEach((entrada) => {
    let grupo = grupos.find((candidato) => candidato.nombre === entrada.grupo);
    if (!grupo) {
      grupo = { nombre: entrada.grupo, entradas: [] };
      grupos.push(grupo);
    }
    grupo.entradas.push(entrada);
  });
  return grupos;
}

function renderizarMenu() {
  const menu = document.getElementById('menu');
  const inferior = document.getElementById('menu-inferior');
  vaciar(menu);
  vaciar(inferior);
  const entradas = obtenerEntradasMenu();
  agruparEntradas(entradas).forEach((grupo) => {
    const botones = grupo.entradas.map((entrada) => crearBotonNavegacion('menu', entrada, entrada.texto));
    menu.appendChild(crearElemento('div', {
      clase: 'menu__grupo',
      atributos: { role: 'group', 'aria-label': grupo.nombre }
    }, [
      crearElemento('p', { clase: 'menu__etiqueta', texto: grupo.nombre, atributos: { 'aria-hidden': 'true' } }),
      ...botones
    ]));
  });
  entradas.forEach((entrada) => {
    inferior.appendChild(crearBotonNavegacion('menu-inferior', entrada, primerNombre(entrada.texto)));
  });
}

function marcarMenuActivo() {
  document.querySelectorAll('[data-vista]').forEach((boton) => {
    if (boton.dataset.vista === String(vistaActiva)) {
      boton.setAttribute('aria-current', 'page');
    } else {
      boton.removeAttribute('aria-current');
    }
  });
}

function actualizarTitulo() {
  let titulo = '';
  if (vistaActiva === 'dashboard') {
    titulo = 'Dashboard';
  } else if (vistaActiva === 'usuarios') {
    titulo = 'Usuarios';
  } else {
    const categoria = categorias.find((candidata) => String(candidata.id) === String(vistaActiva));
    titulo = categoria ? categoria.nombre : '';
  }
  document.getElementById('titulo-pagina').textContent = titulo;
  document.title = titulo ? titulo + ' · Posada ADMIRA' : 'Posada ADMIRA';
}

function crearEsqueletoCarga() {
  const indicadores = [0, 1, 2, 3].map(() => crearElemento('div', { clase: 'esqueleto esqueleto--indicador' }));
  return crearElemento('div', { clase: 'cargando', atributos: { role: 'status', 'aria-label': 'Cargando' } }, [
    crearElemento('span', { clase: 'solo-lectores', texto: 'Cargando…' }),
    crearElemento('div', { clase: 'esqueleto esqueleto--titulo' }),
    crearElemento('div', { clase: 'cargando__rejilla' }, indicadores),
    crearElemento('div', { clase: 'esqueleto esqueleto--grafica' })
  ]);
}

function mostrarCargando() {
  const contenido = document.getElementById('contenido');
  destruirGraficas();
  vaciar(contenido);
  contenido.appendChild(crearEsqueletoCarga());
}

function activarVista(vista, categoriaId, moverFoco) {
  vistaActiva = vista;
  categoriaActivaId = categoriaId;
  marcarMenuActivo();
  actualizarTitulo();
  mostrarCargando();
  if (moverFoco) {
    window.scrollTo({ top: 0 });
    document.getElementById('contenido').focus({ preventScroll: true });
  }
}

async function seleccionarCategoria(categoriaId, moverFoco = false) {
  activarVista(categoriaId, categoriaId, moverFoco);
  await cargarCategoria(categoriaId);
}

async function seleccionarUsuarios(moverFoco = false) {
  activarVista('usuarios', null, moverFoco);
  await cargarUsuarios();
}

async function seleccionarDashboard(moverFoco = false) {
  activarVista('dashboard', null, moverFoco);
  await cargarDashboard();
}

function mostrarDatosUsuario(sesion) {
  document.getElementById('usuario-nombre').textContent = sesion.nombre;
  document.getElementById('usuario-rol').textContent = esAdminSesion() ? 'Administrador' : 'Empleado';
  document.getElementById('avatar').textContent = iniciales(sesion.nombre);
}

function vincularNavegacion() {
  document.getElementById('boton-salir').addEventListener('click', cerrarSesion);
  document.getElementById('boton-salir-movil').addEventListener('click', cerrarSesion);
  document.getElementById('boton-menu').addEventListener('click', alternarMenu);
  consultaEscritorio.addEventListener('change', aplicarMenu);
}

async function iniciarPanel() {
  const sesion = obtenerSesion();
  if (!sesion || sesion.debeCambiarClave) {
    window.location.replace(CONFIG.PAGINA_LOGIN);
    return;
  }
  mostrarDatosUsuario(sesion);
  vincularNavegacion();
  aplicarMenu();
  requestAnimationFrame(() => {
    document.getElementById('app').dataset.listo = 'true';
  });
  iniciarFormulario();
  iniciarDialogoClave();
  iniciarObservadorTema();
  try {
    const datos = await llamarApi('listarCategorias', {}, { conSesion: true });
    categorias = datos.categorias;
    renderizarMenu();
    if (esAdminSesion()) {
      await seleccionarDashboard();
    } else if (categorias.length > 0) {
      await seleccionarCategoria(categorias[0].id);
    }
  } catch (error) {
    mostrarAviso(error.message, true);
  }
}

document.addEventListener('DOMContentLoaded', iniciarPanel);