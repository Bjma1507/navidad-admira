const CLAVE_TEMA = 'navidad-admira-tema';

function leerTemaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch (_) {
    return null;
  }
}

function temaPreferido() {
  const guardado = leerTemaGuardado();
  if (guardado === 'claro' || guardado === 'oscuro') {
    return guardado;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  const boton = document.getElementById('boton-tema');
  if (boton) {
    boton.setAttribute('aria-label', tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  }
}

function guardarTema(tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch (_) {
    return;
  }
}

function alternarTema() {
  const nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  aplicarTema(nuevo);
  guardarTema(nuevo);
}

function iniciarTema() {
  aplicarTema(temaPreferido());
  const boton = document.getElementById('boton-tema');
  if (boton) {
    boton.addEventListener('click', alternarTema);
  }
}

document.addEventListener('DOMContentLoaded', iniciarTema);