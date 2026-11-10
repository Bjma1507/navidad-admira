function normalizarBusqueda(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function fechaRelativa(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const segundos = Math.round((fecha.getTime() - Date.now()) / 1000);
  const absoluto = Math.abs(segundos);
  const formato = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (absoluto < 60) {
    return 'justo ahora';
  }
  if (absoluto < 3600) {
    return formato.format(Math.round(segundos / 60), 'minute');
  }
  if (absoluto < 86400) {
    return formato.format(Math.round(segundos / 3600), 'hour');
  }
  if (absoluto < 604800) {
    return formato.format(Math.round(segundos / 86400), 'day');
  }
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(fecha);
}

function fechaCompleta(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(fecha);
}

function pluralizar(cantidad, singular, plural) {
  return cantidad + ' ' + (cantidad === 1 ? singular : plural);
}

function obtenerIniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '';
  }
  return (partes[0][0] + (partes.length > 1 ? partes[1][0] : '')).toUpperCase();
}

function crearInsigniaIniciales(nombre, clase) {
  const iniciales = obtenerIniciales(nombre);
  const contenedor = crearElemento('span', { clase: 'iniciales' + (clase ? ' ' + clase : ''), atributos: { 'aria-hidden': 'true' } });
  if (iniciales) {
    contenedor.textContent = iniciales;
  } else {
    contenedor.appendChild(crearIcono('ojo-oculto'));
  }
  return contenedor;
}

function crearCampoMensaje(id) {
  return crearElemento('p', { clase: 'mensaje', atributos: { id, role: 'alert', hidden: '' } }, [
    crearElemento('span', { clase: 'mensaje__texto' })
  ]);
}