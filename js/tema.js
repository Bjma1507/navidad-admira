const CLAVE_TEMA = 'navidad-admira-tema';
const TEMA_POR_DEFECTO = 'oscuro';

function leerTemaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch (_) {
    return null;
  }
}

function temaPreferido() {
  const guardado = leerTemaGuardado();
  return guardado === 'claro' || guardado === 'oscuro' ? guardado : TEMA_POR_DEFECTO;
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

aplicarTema(temaPreferido());
document.addEventListener('DOMContentLoaded', iniciarTema);