function renderizarAdministracion() {
  const contenedor = crearElemento('div', { clase: 'admin-cat' });
  contenedor.appendChild(crearElemento('div', { clase: 'admin-cat__columna' }, [renderizarTarjetaReglasAdmin()]));
  contenedor.appendChild(crearElemento('div', { clase: 'admin-cat__columna' }, [
    renderizarTarjetaEstadoAdmin(),
    renderizarTarjetaModeracionAdmin()
  ]));
  return contenedor;
}

function crearEncabezadoTarjetaAdmin(titulo, insignia) {
  const hijos = [crearElemento('h3', { texto: titulo })];
  if (insignia) {
    hijos.push(insignia);
  }
  return crearElemento('header', { clase: 'admin-tarjeta__cabecera' }, hijos);
}

function renderizarTarjetaModeracionAdmin() {
  return crearElemento('article', { clase: 'admin-tarjeta' }, [
    crearEncabezadoTarjetaAdmin('Moderación'),
    crearElemento('p', {
      clase: 'admin-tarjeta__texto',
      texto: 'Abre los detalles de cualquier propuesta para eliminarla o para eliminar sus comentarios.'
    })
  ]);
}

function renderizarTarjetaReglasAdmin() {
  const categoria = estadoCategoria.categoria;
  const entradaPresupuesto = crearElemento('input', {
    atributos: { id: 'reglas-presupuesto', name: 'presupuesto', type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal' }
  });
  entradaPresupuesto.value = categoria.presupuesto === '' || categoria.presupuesto === null ? '' : String(categoria.presupuesto);
  const entradaRequisitos = crearElemento('textarea', {
    atributos: { id: 'reglas-requisitos', name: 'requisitos', rows: '3', maxlength: '300' }
  });
  entradaRequisitos.value = categoria.requisitos;
  const iniciales = {
    presupuesto: entradaPresupuesto.value.trim(),
    requisitos: entradaRequisitos.value.trim()
  };
  const guardar = crearElemento('button', {
    clase: 'boton boton--chico',
    texto: 'Guardar reglas',
    atributos: { type: 'submit' }
  });
  const pendiente = crearElemento('span', {
    clase: 'admin-tarjeta__pendiente',
    texto: 'Cambios sin guardar',
    atributos: { hidden: '', role: 'status' }
  });
  const formulario = crearElemento('form', { clase: 'admin-tarjeta__formulario' }, [
    crearElemento('div', { clase: 'campo' }, [
      crearElemento('label', { texto: 'Presupuesto máximo en MXN (opcional)', atributos: { for: 'reglas-presupuesto' } }),
      entradaPresupuesto
    ]),
    crearElemento('div', { clase: 'campo' }, [
      crearElemento('label', { texto: 'Requisitos (opcional)', atributos: { for: 'reglas-requisitos' } }),
      entradaRequisitos,
      crearContadorTexto(entradaRequisitos, 300)
    ]),
    crearElemento('div', { clase: 'admin-tarjeta__acciones' }, [guardar, pendiente])
  ]);
  const sincronizar = () => {
    const hayCambios = entradaPresupuesto.value.trim() !== iniciales.presupuesto
      || entradaRequisitos.value.trim() !== iniciales.requisitos;
    guardar.disabled = !hayCambios;
    pendiente.hidden = !hayCambios;
  };
  entradaPresupuesto.addEventListener('input', sincronizar);
  entradaRequisitos.addEventListener('input', sincronizar);
  formulario.addEventListener('submit', guardarReglasAdmin);
  sincronizar();
  return crearElemento('article', { clase: 'admin-tarjeta' }, [
    crearEncabezadoTarjetaAdmin('Reglas de la categoría'),
    crearElemento('p', { clase: 'admin-tarjeta__texto', texto: 'Se muestran a todas las personas en el encabezado de la categoría.' }),
    formulario
  ]);
}

function guardarReglasAdmin(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  if (formulario.querySelector('button[type="submit"]').disabled) {
    return Promise.resolve(false);
  }
  return ejecutarAccion('guardarReglasCategoria', {
    presupuesto: formulario.elements.presupuesto.value.trim(),
    requisitos: formulario.elements.requisitos.value.trim()
  }, 'Reglas guardadas.');
}

function crearInsigniaEstadoAdmin(cerrada) {
  return crearElemento('span', { clase: 'estado-cat ' + (cerrada ? 'estado-cat--cerrada' : 'estado-cat--abierta') }, [
    crearIcono(cerrada ? 'candado' : 'circulo-check'),
    crearElemento('span', { texto: cerrada ? 'Cerrada' : 'Abierta' })
  ]);
}

function crearMetricaAdmin(etiqueta, valor) {
  const dato = crearElemento('dd', { texto: valor });
  return {
    dato,
    elemento: crearElemento('div', { clase: 'admin-metrica' }, [
      dato,
      crearElemento('dt', { texto: etiqueta })
    ])
  };
}

async function cargarParticipacionAdmin(destino) {
  const categoriaId = estadoCategoria.categoria.id;
  try {
    const datos = await llamarApi('resultados', { categoriaId }, { conSesion: true });
    if (categoriaId === categoriaActivaId && destino.isConnected) {
      destino.textContent = datos.participacion.votaron + ' de ' + datos.participacion.total;
    }
  } catch (_) {
    if (destino.isConnected) {
      destino.textContent = '—';
    }
  }
}

function renderizarTarjetaEstadoAdmin() {
  const cerrada = categoriaCerrada();
  const propuestas = estadoCategoria.propuestas;
  const totalVotos = propuestas.reduce((suma, propuesta) => suma + (propuesta.votos || 0), 0);
  const metricaPropuestas = crearMetricaAdmin('Propuestas', String(propuestas.length));
  const metricaVotos = crearMetricaAdmin('Votos emitidos', String(totalVotos));
  const metricaParticipacion = crearMetricaAdmin('Participación', '…');
  cargarParticipacionAdmin(metricaParticipacion.dato);
  const boton = crearElemento('button', {
    clase: cerrada ? 'boton boton--chico' : 'boton boton--peligro-suave boton--chico',
    atributos: { type: 'button' }
  }, [
    crearIcono(cerrada ? 'actualizar' : 'candado'),
    crearElemento('span', { texto: cerrada ? 'Reabrir categoría' : 'Cerrar categoría' })
  ]);
  boton.addEventListener('click', () => cambiarEstado(cerrada));
  return crearElemento('article', { clase: 'admin-tarjeta' }, [
    crearEncabezadoTarjetaAdmin('Estado de la categoría', crearInsigniaEstadoAdmin(cerrada)),
    crearElemento('p', {
      clase: 'admin-tarjeta__texto',
      texto: cerrada
        ? 'Nadie puede proponer, votar ni comentar y los resultados son públicos. Si la cerraste por error, puedes reabrirla cuando quieras.'
        : 'Al cerrarla nadie podrá proponer, votar ni comentar y los resultados se publicarán. Podrás reabrirla si te equivocas.'
    }),
    crearElemento('dl', { clase: 'admin-metricas' }, [
      metricaPropuestas.elemento,
      metricaVotos.elemento,
      metricaParticipacion.elemento
    ]),
    boton
  ]);
}

async function cambiarEstado(estabaCerrada) {
  const confirmado = await confirmarAccion({
    titulo: estabaCerrada ? 'Reabrir categoría' : 'Cerrar categoría',
    mensaje: estabaCerrada
      ? 'Se borrará la ganadora elegida en caso de empate y se ocultarán los resultados a las demás personas.'
      : 'Nadie podrá proponer, votar ni comentar y los resultados se publicarán.',
    textoConfirmar: estabaCerrada ? 'Reabrir' : 'Cerrar categoría',
    peligro: !estabaCerrada
  });
  if (!confirmado) {
    return;
  }
  ejecutarAccion(
    estabaCerrada ? 'reabrirCategoria' : 'cerrarCategoria',
    {},
    estabaCerrada ? 'Categoría reabierta.' : 'Categoría cerrada.'
  );
}

function elegirGanadora(propuestaId) {
  return ejecutarAccion('elegirGanadora', { propuestaId }, 'Ganadora elegida.');
}