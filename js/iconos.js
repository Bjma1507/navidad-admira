const ESPACIO_SVG = 'http://www.w3.org/2000/svg';

function crearIcono(nombre, clase) {
  const svg = document.createElementNS(ESPACIO_SVG, 'svg');
  svg.setAttribute('class', clase ? 'icono ' + clase : 'icono');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(ESPACIO_SVG, 'use');
  uso.setAttribute('href', '#i-' + nombre);
  svg.appendChild(uso);
  return svg;
}

function iconoDeCategoria(nombre) {
  const texto = String(nombre).toLowerCase();
  if (texto.includes('restaurante')) {
    return 'cubiertos';
  }
  if (texto.includes('actividad')) {
    return 'confeti';
  }
  if (texto.includes('rifa')) {
    return 'boleto';
  }
  return 'voto';
}