const AYUDAS_CAMPO = Object.freeze({
  ubicacion: { etiqueta: 'Ubicación', marcador: 'Calle, colonia y ciudad' },
  enlace: { etiqueta: 'Enlace', marcador: 'https://…' },
  nota: { etiqueta: 'Nota breve', marcador: '¿Por qué te gusta o qué tiene de especial?' }
});

const LONGITUD_MINIMA_SIMILITUD = 4;

function crearEtiquetaCampo(campo, id) {
  const ayuda = AYUDAS_CAMPO[campo.clave];
  const base = ayuda ? ayuda.etiqueta : campo.etiqueta;
  return crearElemento('label', { texto: base + (campo.requerido ? '' : ' (opcional)'), atributos: { for: id } });
}

function crearControlCampo(campo, id) {
  const ayuda = AYUDAS_CAMPO[campo.clave];
  const atributos = { id, name: campo.clave, autocomplete: 'off' };
  if (ayuda) {
    atributos.placeholder = ayuda.marcador;
  }
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

function crearContadorTexto(control, maximo) {
  const contador = crearElemento('span', { clase: 'campo__contador', texto: '0/' + maximo, atributos: { 'aria-hidden': 'true' } });
  control.addEventListener('input', () => {
    contador.textContent = control.value.length + '/' + maximo;
  });
  return contador;
}

function crearCampoFormulario(campo) {
  const id = 'campo-' + campo.clave;
  const contenedor = crearElemento('div', { clase: 'campo' });
  contenedor.appendChild(crearEtiquetaCampo(campo, id));
  const control = crearControlCampo(campo, id);
  contenedor.appendChild(control);
  if (control.tagName === 'TEXTAREA') {
    contenedor.appendChild(crearContadorTexto(control, campo.max));
  }
  return contenedor;
}

function crearCampoTitulo(estado) {
  const vista = configuracionVista(estado.categoria.id);
  const contenedor = crearElemento('div', { clase: 'campo' });
  const control = crearElemento('input', {
    atributos: {
      id: 'campo-titulo',
      name: 'titulo',
      type: 'text',
      maxlength: '80',
      autocomplete: 'off',
      placeholder: vista.marcadorNombre
    }
  });
  control.required = true;
  const aviso = crearElemento('p', { clase: 'campo__aviso', atributos: { role: 'status', hidden: '' } });
  control.addEventListener('input', () => {
    const parecida = buscarPropuestaParecida(estado, control.value);
    aviso.hidden = !parecida;
    aviso.textContent = parecida ? 'Ya hay una propuesta parecida: «' + parecida.titulo + '». Puedes publicarla igual si es otra.' : '';
  });
  contenedor.appendChild(crearElemento('label', { texto: vista.nombreCampo, atributos: { for: 'campo-titulo' } }));
  contenedor.appendChild(control);
  contenedor.appendChild(aviso);
  return contenedor;
}

function buscarPropuestaParecida(estado, valor) {
  const buscado = normalizarBusqueda(valor);
  if (buscado.length < LONGITUD_MINIMA_SIMILITUD) {
    return null;
  }
  return estado.propuestas.find((propuesta) => {
    const existente = normalizarBusqueda(propuesta.titulo);
    return existente === buscado
      || (existente.length >= LONGITUD_MINIMA_SIMILITUD && (existente.includes(buscado) || buscado.includes(existente)));
  }) || null;
}

function crearInterruptorAnonimo() {
  const entrada = crearElemento('input', { atributos: { type: 'checkbox', name: 'anonima', role: 'switch' } });
  return crearElemento('label', { clase: 'interruptor' }, [
    entrada,
    crearElemento('span', { clase: 'interruptor__pista', atributos: { 'aria-hidden': 'true' } }),
    crearElemento('span', { clase: 'interruptor__texto', texto: 'Ocultar mi nombre a los demás' })
  ]);
}

function leerDatosFormulario(formulario, campos) {
  const datos = {};
  campos.forEach((campo) => {
    datos[campo.clave] = formulario.elements[campo.clave].value.trim();
  });
  return datos;
}

function construirFormulario(estado, modal) {
  const categoria = estado.categoria;
  const restantes = limitePropuestas() - propuestasUsadas();
  const formulario = crearElemento('form', { clase: 'modal__formulario' });
  const campos = crearElemento('div', { clase: 'modal__campos' });
  campos.appendChild(crearCampoTitulo(estado));
  estado.campos.forEach((campo) => campos.appendChild(crearCampoFormulario(campo)));
  const mensaje = crearCampoMensaje('mensaje-propuesta');
  const cancelar = crearElemento('button', { clase: 'boton boton--secundario', texto: 'Cancelar', atributos: { type: 'button' } });
  const enviar = crearElemento('button', { clase: 'boton', atributos: { type: 'submit' } }, [
    crearElemento('span', { clase: 'boton__texto', texto: 'Publicar propuesta' })
  ]);
  cancelar.addEventListener('click', () => modal.close());
  formulario.appendChild(crearElemento('header', { clase: 'modal__cabecera' }, [
    crearElemento('span', { clase: 'modal__icono' }, [crearIcono(configuracionVista(categoria.id).icono)]),
    crearElemento('div', { clase: 'modal__encabezado' }, [
      crearElemento('h2', { clase: 'modal__titulo', texto: 'Nueva propuesta', atributos: { id: 'titulo-propuesta' } }),
      crearElemento('p', {
        clase: 'modal__subtitulo',
        texto: categoria.nombre + ' · te ' + (restantes === 1 ? 'queda ' : 'quedan ') + pluralizar(restantes, 'propuesta', 'propuestas')
      })
    ])
  ]));
  formulario.appendChild(campos);
  formulario.appendChild(mensaje);
  formulario.appendChild(crearElemento('footer', { clase: 'modal__pie' }, [
    crearInterruptorAnonimo(),
    crearElemento('div', { clase: 'modal__acciones' }, [cancelar, enviar])
  ]));
  formulario.addEventListener('submit', (evento) => enviarPropuesta(evento, estado, modal));
  return formulario;
}

function abrirFormulario(estado) {
  if (document.querySelector('.modal--propuesta')) {
    return;
  }
  const modal = crearModal('modal--propuesta', 'titulo-propuesta');
  modal.appendChild(construirFormulario(estado, modal));
  abrirModal(modal);
  const primero = modal.querySelector('#campo-titulo');
  if (primero) {
    primero.focus();
  }
}

async function enviarPropuesta(evento, estado, modal) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const mensaje = formulario.querySelector('#mensaje-propuesta');
  const boton = formulario.querySelector('button[type="submit"]');
  const categoriaId = estado.categoria.id;
  limpiarMensaje(mensaje);
  establecerCargando(boton, true, 'Publicando…');
  try {
    await llamarApi('crearPropuesta', {
      categoriaId,
      titulo: formulario.elements.titulo.value.trim(),
      datos: leerDatosFormulario(formulario, estado.campos),
      anonima: formulario.elements.anonima.checked
    }, { conSesion: true });
    modal.close();
    mostrarAviso('Propuesta publicada.');
    filtrosPropuestas.pagina = 1;
    await cargarCategoria(categoriaId, true);
  } catch (error) {
    mostrarMensaje(mensaje, error.message);
  } finally {
    establecerCargando(boton, false);
  }
}

function iniciarFormulario() {
  const anterior = document.getElementById('dialogo-propuesta');
  if (anterior) {
    anterior.remove();
  }
}