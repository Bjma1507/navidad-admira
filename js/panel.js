let categorias = [];
let categoriaActivaId = null;
let vistaActiva = null;

function crearBotonMenu(identificador, texto, alSeleccionar) {
  const boton = crearElemento('button', {
    clase: 'menu__boton',
    texto: texto,
    atributos: { type: 'button', 'data-vista': identificador }
  });
  boton.addEventListener('click', alSeleccionar);
  return boton;
}

function renderizarMenu() {
  const menu = document.getElementById('menu');
  vaciar(menu);
  if (esAdminSesion()) {
    menu.appendChild(crearBotonMenu('dashboard', 'Dashboard', seleccionarDashboard));
  }
  categorias.forEach((categoria) => {
    menu.appendChild(crearBotonMenu(categoria.id, categoria.nombre, () => seleccionarCategoria(categoria.id)));
  });
  if (esAdminSesion()) {
    menu.appendChild(crearBotonMenu('usuarios', 'Usuarios', seleccionarUsuarios));
  }
}

function marcarMenuActivo() {
  document.querySelectorAll('.menu__boton').forEach((boton) => {
    if (boton.dataset.vista === vistaActiva) {
      boton.setAttribute('aria-current', 'page');
    } else {
      boton.removeAttribute('aria-current');
    }
  });
}

function mostrarCargando() {
  const contenido = document.getElementById('contenido');
  destruirGraficas();
  vaciar(contenido);
  contenido.appendChild(crearElemento('p', { clase: 'cargando', texto: 'Cargando…', atributos: { role: 'status' } }));
}

async function seleccionarCategoria(categoriaId) {
  vistaActiva = categoriaId;
  categoriaActivaId = categoriaId;
  marcarMenuActivo();
  mostrarCargando();
  await cargarCategoria(categoriaId);
}

async function seleccionarUsuarios() {
  vistaActiva = 'usuarios';
  categoriaActivaId = null;
  marcarMenuActivo();
  mostrarCargando();
  await cargarUsuarios();
}

async function seleccionarDashboard() {
  vistaActiva = 'dashboard';
  categoriaActivaId = null;
  marcarMenuActivo();
  mostrarCargando();
  await cargarDashboard();
}

async function iniciarPanel() {
  const sesion = obtenerSesion();
  if (!sesion || sesion.debeCambiarClave) {
    window.location.replace(CONFIG.PAGINA_LOGIN);
    return;
  }
  document.getElementById('saludo').textContent = sesion.nombre;
  document.getElementById('boton-salir').addEventListener('click', cerrarSesion);
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