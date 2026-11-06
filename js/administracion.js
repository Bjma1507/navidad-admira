function renderizarAdministracion() {
  const seccion = crearElemento('section', { clase: 'administracion', atributos: { 'aria-label': 'Administración' } });
  seccion.appendChild(crearElemento('h3', { texto: 'Administración' }));
  seccion.appendChild(renderizarFormularioReglas());
  seccion.appendChild(renderizarBotonEstado());
  return seccion;
}

function renderizarFormularioReglas() {
  const categoria = estadoCategoria.categoria;
  const formulario = crearElemento('form', { clase: 'administracion__formulario' });
  const entradaPresupuesto = crearElemento('input', {
    atributos: { id: 'reglas-presupuesto', name: 'presupuesto', type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal' }
  });
  entradaPresupuesto.value = categoria.presupuesto === '' || categoria.presupuesto === null ? '' : String(categoria.presupuesto);
  const entradaRequisitos = crearElemento('textarea', {
    atributos: { id: 'reglas-requisitos', name: 'requisitos', rows: '3', maxlength: '300' }
  });
  entradaRequisitos.value = categoria.requisitos;
  formulario.appendChild(crearElemento('div', { clase: 'campo' }, [
    crearElemento('label', { texto: 'Presupuesto máximo en MXN (opcional)', atributos: { for: 'reglas-presupuesto' } }),
    entradaPresupuesto
  ]));
  formulario.appendChild(crearElemento('div', { clase: 'campo' }, [
    crearElemento('label', { texto: 'Requisitos (opcional)', atributos: { for: 'reglas-requisitos' } }),
    entradaRequisitos
  ]));
  formulario.appendChild(crearElemento('button', {
    clase: 'boton boton--chico',
    texto: 'Guardar reglas',
    atributos: { type: 'submit' }
  }));
  formulario.addEventListener('submit', guardarReglas);
  return formulario;
}

function guardarReglas(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  return ejecutarAccion('guardarReglasCategoria', {
    presupuesto: formulario.elements.presupuesto.value.trim(),
    requisitos: formulario.elements.requisitos.value.trim()
  }, 'Reglas guardadas.');
}

function renderizarBotonEstado() {
  const cerrada = categoriaCerrada();
  const boton = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    texto: cerrada ? 'Reabrir categoría' : 'Cerrar categoría',
    atributos: { type: 'button' }
  });
  boton.addEventListener('click', () => cambiarEstado(cerrada));
  return boton;
}

function cambiarEstado(estabaCerrada) {
  const pregunta = estabaCerrada
    ? '¿Reabrir la categoría? Se borrará la ganadora elegida en caso de empate.'
    : '¿Cerrar la categoría? Nadie podrá proponer ni votar y los resultados se publicarán.';
  if (!window.confirm(pregunta)) {
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