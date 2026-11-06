let estadoUsuarios = null;
let restableciendo = false;

async function cargarUsuarios() {
  const contenido = document.getElementById('contenido');
  try {
    const datos = await llamarApi('listarUsuarios', {}, { conSesion: true });
    if (vistaActiva !== 'usuarios') {
      return;
    }
    estadoUsuarios = datos;
    renderizarUsuarios();
  } catch (error) {
    if (vistaActiva !== 'usuarios') {
      return;
    }
    vaciar(contenido);
    contenido.appendChild(crearElemento('p', { clase: 'mensaje', texto: error.message, atributos: { role: 'alert' } }));
  }
}

function renderizarUsuarios() {
  const contenido = document.getElementById('contenido');
  vaciar(contenido);
  contenido.appendChild(crearElemento('h2', { texto: 'Usuarios' }));
  contenido.appendChild(crearElemento('p', {
    clase: 'categoria__dato',
    texto: 'Al restablecer una clave se genera una clave temporal nueva que verás una sola vez.'
  }));
  const lista = crearElemento('div', { clase: 'usuarios__lista' });
  estadoUsuarios.usuarios.forEach((usuario) => lista.appendChild(renderizarUsuario(usuario)));
  contenido.appendChild(lista);
}

function renderizarUsuario(usuario) {
  const tarjeta = crearElemento('article', { clase: 'tarjeta' });
  tarjeta.appendChild(crearElemento('h4', { texto: usuario.nombre }));
  tarjeta.appendChild(crearElemento('p', {
    clase: 'tarjeta__autor',
    texto: usuario.puesto + ' · ' + (usuario.rol === 'admin' ? 'Administrador' : 'Empleado')
  }));
  tarjeta.appendChild(crearElemento('p', {
    clase: usuario.claveTemporalPendiente ? 'etiqueta etiqueta--pendiente' : 'etiqueta etiqueta--lista',
    texto: usuario.claveTemporalPendiente ? 'Aún no crea su clave' : 'Ya creó su clave'
  }));
  tarjeta.appendChild(crearElemento('p', {
    clase: 'categoria__dato',
    texto: 'Votó en ' + usuario.categoriasVotadas + ' de ' + estadoUsuarios.totalCategorias + ' categorías · ' + usuario.propuestas + (usuario.propuestas === 1 ? ' propuesta' : ' propuestas')
  }));
  const boton = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    texto: 'Restablecer clave',
    atributos: { type: 'button', 'aria-label': 'Restablecer la clave de ' + usuario.nombre }
  });
  boton.addEventListener('click', () => restablecerClaveDe(usuario));
  tarjeta.appendChild(boton);
  return tarjeta;
}

async function restablecerClaveDe(usuario) {
  if (restableciendo) {
    return;
  }
  const pregunta = '¿Restablecer la clave de ' + usuario.nombre + '? Su clave actual dejará de funcionar.';
  if (!window.confirm(pregunta)) {
    return;
  }
  restableciendo = true;
  const contenido = document.getElementById('contenido');
  contenido.classList.add('ocupado');
  try {
    const datos = await llamarApi('restablecerClave', { usuarioId: usuario.id }, { conSesion: true });
    mostrarClaveTemporal(datos);
    await cargarUsuarios();
  } catch (error) {
    mostrarAviso(error.message, true);
  } finally {
    contenido.classList.remove('ocupado');
    restableciendo = false;
  }
}

function mostrarClaveTemporal(datos) {
  document.getElementById('clave-descripcion').textContent =
    'Entrégale esta clave a ' + datos.nombre + '. Al entrar deberá crear una clave propia.';
  document.getElementById('clave-valor').textContent = datos.claveTemporal;
  document.getElementById('dialogo-clave').showModal();
}

function limpiarClaveTemporal() {
  document.getElementById('clave-valor').textContent = '';
  document.getElementById('clave-descripcion').textContent = '';
}

async function copiarClaveTemporal() {
  const boton = document.getElementById('copiar-clave');
  const clave = document.getElementById('clave-valor').textContent;
  let texto = 'Copiada';
  try {
    await navigator.clipboard.writeText(clave);
  } catch (_) {
    texto = 'Cópiala a mano';
  }
  boton.textContent = texto;
  setTimeout(() => {
    boton.textContent = 'Copiar';
  }, 2000);
}

function iniciarDialogoClave() {
  const dialogo = document.getElementById('dialogo-clave');
  dialogo.addEventListener('close', limpiarClaveTemporal);
  document.getElementById('copiar-clave').addEventListener('click', copiarClaveTemporal);
  document.getElementById('cerrar-clave').addEventListener('click', () => dialogo.close());
}