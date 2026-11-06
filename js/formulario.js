let categoriaDelFormulario = null;
let camposDelFormulario = [];

function crearControl(campo) {
  const atributos = { id: 'campo-' + campo.clave, name: campo.clave };
  let control;
  if (campo.tipo === 'texto' && campo.max > 150) {
    control = crearElemento('textarea', { atributos: { ...atributos, rows: '3', maxlength: String(campo.max) } });
  } else {
    const tipoEntrada = campo.tipo === 'numero' ? 'number' : campo.tipo === 'url' ? 'url' : 'text';
    control = crearElemento('input', { atributos: { ...atributos, type: tipoEntrada } });
    if (campo.tipo === 'numero') {
      control.min = '0.01';
      control.step = '0.01';
      control.inputMode = 'decimal';
    } else {
      control.maxLength = campo.max;
    }
  }
  control.required = campo.requerido;
  return control;
}

function crearCampoFormulario(campo) {
  const contenedor = crearElemento('div', { clase: 'campo' });
  contenedor.appendChild(crearElemento('label', {
    texto: campo.etiqueta + (campo.requerido ? '' : ' (opcional)'),
    atributos: { for: 'campo-' + campo.clave }
  }));
  contenedor.appendChild(crearControl(campo));
  return contenedor;
}

function construirFormulario() {
  const formulario = document.getElementById('formulario-propuesta');
  const zona = document.getElementById('campos-propuesta');
  vaciar(zona);
  zona.appendChild(crearCampoFormulario({ clave: 'titulo', etiqueta: 'Nombre', tipo: 'texto', max: 80, requerido: true }));
  camposDelFormulario.forEach((campo) => zona.appendChild(crearCampoFormulario(campo)));
  document.getElementById('titulo-dialogo').textContent = 'Nueva propuesta: ' + categoriaDelFormulario.nombre;
  formulario.reset();
  limpiarMensaje(document.getElementById('mensaje-propuesta'));
}

function leerDatosFormulario(formulario) {
  const datos = {};
  camposDelFormulario.forEach((campo) => {
    datos[campo.clave] = formulario.elements[campo.clave].value.trim();
  });
  return datos;
}

function abrirFormulario(estado) {
  categoriaDelFormulario = estado.categoria;
  camposDelFormulario = estado.campos;
  construirFormulario();
  document.getElementById('dialogo-propuesta').showModal();
}

function cerrarFormulario() {
  document.getElementById('dialogo-propuesta').close();
}

async function enviarPropuesta(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const mensaje = document.getElementById('mensaje-propuesta');
  const boton = formulario.querySelector('button[type="submit"]');
  const categoriaId = categoriaDelFormulario.id;
  limpiarMensaje(mensaje);
  establecerCargando(boton, true, 'Publicando…');
  try {
    await llamarApi('crearPropuesta', {
      categoriaId: categoriaId,
      titulo: formulario.elements.titulo.value.trim(),
      datos: leerDatosFormulario(formulario),
      anonima: formulario.elements.anonima.checked
    }, { conSesion: true });
    cerrarFormulario();
    mostrarAviso('Propuesta publicada.');
    await cargarCategoria(categoriaId);
  } catch (error) {
    mostrarMensaje(mensaje, error.message);
  } finally {
    establecerCargando(boton, false);
  }
}

function iniciarFormulario() {
  document.getElementById('formulario-propuesta').addEventListener('submit', enviarPropuesta);
  document.getElementById('cancelar-propuesta').addEventListener('click', cerrarFormulario);
}