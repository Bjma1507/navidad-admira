function crearElemento(etiqueta, opciones = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);
  if (opciones.clase) {
    elemento.className = opciones.clase;
  }
  if (opciones.texto !== undefined) {
    elemento.textContent = opciones.texto;
  }
  if (opciones.atributos) {
    Object.keys(opciones.atributos).forEach((nombre) => {
      elemento.setAttribute(nombre, opciones.atributos[nombre]);
    });
  }
  hijos.forEach((hijo) => elemento.appendChild(hijo));
  return elemento;
}

function vaciar(elemento) {
  while (elemento.firstChild) {
    elemento.removeChild(elemento.firstChild);
  }
}

function esEnlaceSeguro(valor) {
  try {
    return new URL(valor).protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function formatearDinero(valor) {
  const numero = Number(valor);
  if (!isFinite(numero)) {
    return String(valor);
  }
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(numero);
}

function mostrarMensaje(elemento, texto) {
  const destino = elemento.querySelector('.mensaje__texto') || elemento;
  destino.textContent = texto;
  elemento.hidden = false;
}

function limpiarMensaje(elemento) {
  const destino = elemento.querySelector('.mensaje__texto') || elemento;
  destino.textContent = '';
  elemento.hidden = true;
}

function establecerCargando(boton, cargando, textoCargando) {
  const etiqueta = boton.querySelector('.boton__texto') || boton;
  if (cargando) {
    etiqueta.dataset.textoOriginal = etiqueta.textContent;
    etiqueta.textContent = textoCargando;
  } else if (etiqueta.dataset.textoOriginal) {
    etiqueta.textContent = etiqueta.dataset.textoOriginal;
  }
  boton.disabled = cargando;
  boton.dataset.cargando = String(cargando);
  boton.setAttribute('aria-busy', String(cargando));
}

let temporizadorAviso = null;

function mostrarAviso(texto, esError = false) {
  const aviso = document.getElementById('aviso');
  aviso.textContent = texto;
  aviso.dataset.tipo = esError ? 'error' : 'exito';
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    aviso.hidden = true;
  }, 5000);
}