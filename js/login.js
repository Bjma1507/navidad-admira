const REQUISITOS_CLAVE = [
  { id: 'longitud', prueba: (clave) => clave.length >= 10 },
  { id: 'mayuscula', prueba: (clave) => /[A-Z]/.test(clave) },
  { id: 'minuscula', prueba: (clave) => /[a-z]/.test(clave) },
  { id: 'numero', prueba: (clave) => /[0-9]/.test(clave) }
];

function requisitosCumplidos(clave) {
  return REQUISITOS_CLAVE.every((requisito) => requisito.prueba(clave));
}

function actualizarRequisitos(clave) {
  REQUISITOS_CLAVE.forEach((requisito) => {
    const item = document.querySelector('[data-requisito="' + requisito.id + '"]');
    if (!item) {
      return;
    }
    const cumple = requisito.prueba(clave);
    item.dataset.cumple = String(cumple);
    item.querySelector('.estado').textContent = cumple ? 'Cumplido: ' : 'Pendiente: ';
  });
}

function mostrarVista(nombre) {
  const vistas = { login: 'formulario-login', clave: 'formulario-clave' };
  Object.keys(vistas).forEach((llave) => {
    document.getElementById(vistas[llave]).hidden = llave !== nombre;
  });
  const primerCampo = document.getElementById(vistas[nombre]).querySelector('input');
  if (primerCampo) {
    primerCampo.focus();
  }
}

function alternarVisibilidadClave(boton) {
  const campo = document.getElementById(boton.dataset.objetivo);
  const estabaVisible = campo.type === 'text';
  campo.type = estabaVisible ? 'password' : 'text';
  boton.textContent = estabaVisible ? 'Mostrar' : 'Ocultar';
  boton.setAttribute('aria-label', estabaVisible ? 'Mostrar clave' : 'Ocultar clave');
}

function redirigirAlPanel() {
  window.location.replace(CONFIG.PAGINA_PANEL);
}

async function manejarEnvioLogin(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const correo = formulario.elements.correo.value.trim();
  const clave = formulario.elements.clave.value;
  const mensaje = document.getElementById('mensaje-login');
  const boton = formulario.querySelector('button[type="submit"]');
  limpiarMensaje(mensaje);
  if (!correo || !clave) {
    mostrarMensaje(mensaje, 'Escribe tu correo y tu clave.');
    return;
  }
  establecerCargando(boton, true, 'Entrando…');
  try {
    const datos = await llamarApi('login', { correo, clave });
    guardarSesion(datos);
    formulario.reset();
    if (datos.debeCambiarClave) {
      mostrarVista('clave');
    } else {
      redirigirAlPanel();
    }
  } catch (error) {
    mostrarMensaje(mensaje, error.message);
  } finally {
    establecerCargando(boton, false);
  }
}

function validarCambioClave(claveActual, claveNueva, confirmacion) {
  if (!claveActual || !claveNueva || !confirmacion) {
    return 'Completa todos los campos.';
  }
  if (!requisitosCumplidos(claveNueva)) {
    return 'La clave nueva no cumple los requisitos.';
  }
  if (claveNueva !== confirmacion) {
    return 'La confirmación no coincide con la clave nueva.';
  }
  if (claveNueva === claveActual) {
    return 'La clave nueva debe ser distinta de la temporal.';
  }
  return null;
}

async function manejarEnvioCambioClave(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const claveActual = formulario.elements.claveActual.value;
  const claveNueva = formulario.elements.claveNueva.value;
  const confirmacion = formulario.elements.confirmacion.value;
  const mensaje = document.getElementById('mensaje-clave');
  const boton = formulario.querySelector('button[type="submit"]');
  limpiarMensaje(mensaje);
  const problema = validarCambioClave(claveActual, claveNueva, confirmacion);
  if (problema) {
    mostrarMensaje(mensaje, problema);
    return;
  }
  establecerCargando(boton, true, 'Guardando…');
  try {
    const datos = await llamarApi('cambiarClave', { claveActual, claveNueva }, { conSesion: true });
    guardarSesion(datos);
    formulario.reset();
    redirigirAlPanel();
  } catch (error) {
    mostrarMensaje(mensaje, error.message);
  } finally {
    establecerCargando(boton, false);
  }
}

function vincularEventos() {
  document.getElementById('formulario-login').addEventListener('submit', manejarEnvioLogin);
  document.getElementById('formulario-clave').addEventListener('submit', manejarEnvioCambioClave);
  document.getElementById('claveNueva').addEventListener('input', (evento) => actualizarRequisitos(evento.target.value));
  document.querySelectorAll('[data-objetivo]').forEach((boton) => {
    boton.addEventListener('click', () => alternarVisibilidadClave(boton));
  });
}

function iniciarLogin() {
  vincularEventos();
  actualizarRequisitos('');
  const sesion = obtenerSesion();
  if (!sesion) {
    return;
  }
  if (sesion.debeCambiarClave) {
    mostrarVista('clave');
  } else {
    redirigirAlPanel();
  }
}

document.addEventListener('DOMContentLoaded', iniciarLogin);

