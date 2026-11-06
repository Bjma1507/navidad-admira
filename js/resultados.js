function debeConsultarResultados() {
  return esAdminSesion() || categoriaCerrada();
}

function crearContenedorResultados() {
  return crearElemento('section', {
    clase: 'resultados',
    atributos: { id: 'resultados', 'aria-label': 'Resultados' }
  });
}

async function mostrarResultados(categoriaId) {
  const contenedor = document.getElementById('resultados');
  if (!contenedor) {
    return;
  }
  vaciar(contenedor);
  contenedor.appendChild(crearElemento('h3', { texto: 'Resultados' }));
  if (!debeConsultarResultados()) {
    contenedor.appendChild(crearElemento('p', {
      clase: 'categoria__dato',
      texto: 'Los resultados se publicarán cuando se cierre la categoría.'
    }));
    return;
  }
  try {
    const datos = await llamarApi('resultados', { categoriaId }, { conSesion: true });
    if (categoriaId !== categoriaActivaId || !contenedor.isConnected) {
      return;
    }
    contenedor.appendChild(renderizarResultados(datos));
  } catch (error) {
    if (categoriaId !== categoriaActivaId || !contenedor.isConnected) {
      return;
    }
    contenedor.appendChild(crearElemento('p', { clase: 'mensaje', texto: error.message, atributos: { role: 'alert' } }));
  }
}

function renderizarResultados(datos) {
  const bloque = crearElemento('div', { clase: 'resultados__bloque' });
  if (datos.categoria.estado !== 'cerrada') {
    bloque.appendChild(crearElemento('p', {
      clase: 'categoria__dato',
      texto: 'Resultados parciales: solo los ves tú como administrador.'
    }));
  }
  bloque.appendChild(crearElemento('p', {
    clase: 'categoria__dato',
    texto: 'Han votado ' + datos.participacion.votaron + ' de ' + datos.participacion.total + ' personas.'
  }));
  bloque.appendChild(renderizarEstadoGanadora(datos));
  if (datos.ranking.length > 0) {
    bloque.appendChild(renderizarRanking(datos));
  }
  return bloque;
}

function renderizarEstadoGanadora(datos) {
  const ganadora = datos.ganadora;
  const cerrada = datos.categoria.estado === 'cerrada';
  const titulo = (id) => {
    const item = datos.ranking.find((r) => r.propuestaId === id);
    return item ? item.titulo : '';
  };
  let texto = 'Aún no hay votos.';
  if (ganadora.estado === 'definida') {
    texto = (cerrada ? 'Ganadora: ' : 'Va ganando: ') + titulo(ganadora.ganadoraId);
  } else if (ganadora.estado === 'empate') {
    texto = cerrada
      ? 'Empate entre: ' + ganadora.empatadas.map(titulo).join(', ') + '. Pendiente de decisión del administrador.'
      : 'Empate por ahora entre: ' + ganadora.empatadas.map(titulo).join(', ') + '.';
  }
  return crearElemento('p', { clase: 'resultados__estado', texto });
}

function renderizarRanking(datos) {
  const lista = crearElemento('ol', { clase: 'ranking' });
  const puedeDesempatar = esAdminSesion() && datos.categoria.estado === 'cerrada' && datos.ganadora.estado === 'empate';
  datos.ranking.forEach((item, indice) => {
    const fila = crearElemento('li', { clase: 'ranking__item' });
    if (item.propuestaId === datos.ganadora.ganadoraId) {
      fila.classList.add('ranking__item--ganadora');
    }
    const detalle = item.puntos + (item.puntos === 1 ? ' punto' : ' puntos') + ' · ' + item.votantes + (item.votantes === 1 ? ' voto' : ' votos') + (item.autor ? ' · ' + item.autor : '');
    fila.appendChild(crearElemento('div', { clase: 'ranking__texto' }, [
      crearElemento('strong', { texto: (indice + 1) + '. ' + item.titulo }),
      crearElemento('span', { texto: detalle })
    ]));
    if (puedeDesempatar && datos.ganadora.empatadas.indexOf(item.propuestaId) !== -1) {
      const boton = crearElemento('button', {
        clase: 'boton boton--chico',
        texto: 'Elegir como ganadora',
        atributos: { type: 'button' }
      });
      boton.addEventListener('click', () => elegirGanadora(item.propuestaId));
      fila.appendChild(boton);
    }
    lista.appendChild(fila);
  });
  return lista;
}