const CLAVE_SESION = 'navidad-admira-sesion';

function guardarSesion(datos) {
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
  } catch (_) {
    return false;
  }
  return true;
}

function obtenerSesion() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION);
    return crudo ? JSON.parse(crudo) : null;
  } catch (_) {
    return null;
  }
}

function obtenerToken() {
  const sesion = obtenerSesion();
  return sesion ? sesion.token : null;
}

function esAdminSesion() {
  const sesion = obtenerSesion();
  return Boolean(sesion) && String(sesion.rol).toLowerCase() === 'admin';
}

function cerrarSesionLocal() {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
  } catch (_) {
    return;
  }
}

async function cerrarSesion() {
  try {
    await llamarApi('logout', {}, { conSesion: true });
  } catch (_) {
    cerrarSesionLocal();
  }
  cerrarSesionLocal();
  window.location.replace(CONFIG.PAGINA_LOGIN);
}