class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

async function enviarSolicitud(cuerpo) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), CONFIG.TIEMPO_MAXIMO_MS);
  let respuesta;
  try {
    respuesta = await fetch(CONFIG.URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal
    });
  } catch (_) {
    throw new ErrorApi('RED', 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.');
  } finally {
    clearTimeout(temporizador);
  }
  try {
    return await respuesta.json();
  } catch (_) {
    throw new ErrorApi('RESPUESTA_INVALIDA', 'Respuesta inesperada del servidor.');
  }
}

function extraerError(resultado) {
  const error = resultado && resultado.error ? resultado.error : null;
  return {
    codigo: error && typeof error.codigo === 'string' ? error.codigo : 'ERROR',
    mensaje: error && typeof error.mensaje === 'string' ? error.mensaje : 'No se pudo procesar la solicitud.'
  };
}

async function llamarApi(accion, datos = {}, opciones = {}) {
  const cuerpo = { ...datos, accion };
  if (opciones.conSesion) {
    cuerpo.token = obtenerToken();
  }
  const resultado = await enviarSolicitud(cuerpo);
  if (resultado && resultado.ok === true) {
    return resultado.datos;
  }
  const error = extraerError(resultado);
  if (opciones.conSesion && error.codigo === 'SESION_INVALIDA') {
    cerrarSesionLocal();
    window.location.replace(CONFIG.PAGINA_LOGIN);
  }
  throw new ErrorApi(error.codigo, error.mensaje);
}