async function mostrarResultados(categoriaId) {
  const panel = document.getElementById('panel-resultados');
  if (!panel) {
    return;
  }
  vaciar(panel);
  panel.appendChild(crearElemento('div', { clase: 'resultados__esqueleto', atributos: { 'aria-hidden': 'true' } }, [
    crearElemento('span', { clase: 'esqueleto-cat esqueleto-cat--bloque' }),
    crearElemento('span', { clase: 'esqueleto-cat esqueleto-cat--bloque' })
  ]));
  try {
    const datos = await llamarApi('resultados', { categoriaId }, { conSesion: true });
    if (categoriaId !== categoriaActivaId || !panel.isConnected) {
      return;
    }
    vaciar(panel);
    panel.appendChild(renderizarResultados(datos));
  } catch (error) {
    if (categoriaId !== categoriaActivaId || !panel.isConnected) {
      return;
    }
    vaciar(panel);
    const reintentar = crearElemento('button', { clase: 'boton boton--secundario boton--chico', texto: 'Reintentar', atributos: { type: 'button' } });
    reintentar.addEventListener('click', () => mostrarResultados(categoriaId));
    panel.appendChild(crearElemento('div', { clase: 'vacio-cat' }, [
      crearElemento('span', { clase: 'vacio-cat__icono vacio-cat__icono--alerta' }, [crearIcono('alerta')]),
      crearElemento('p', { clase: 'vacio-cat__texto', texto: error.message, atributos: { role: 'alert' } }),
      reintentar
    ]));
  }
}

function renderizarResultados(datos) {
  const bloque = crearElemento('div', { clase: 'resultados-cat' });
  if (datos.categoria.estado !== 'cerrada') {
    bloque.appendChild(crearElemento('p', { clase: 'nota-cat' }, [
      crearIcono('candado'),
      crearElemento('span', { texto: 'Resultados parciales: solo los ves tú como administrador.' })
    ]));
  }
  bloque.appendChild(crearElemento('div', { clase: 'resultados__resumen' }, [
    renderizarParticipacion(datos.participacion),
    renderizarEstadoGanadora(datos)
  ]));
  if (datos.ranking.length > 0) {
    bloque.appendChild(renderizarRanking(datos));
  }
  return bloque;
}

function renderizarParticipacion(participacion) {
  const porcentaje = participacion.total > 0 ? Math.round((participacion.votaron / participacion.total) * 100) : 0;
  const barra = crearElemento('div', { clase: 'barra-cat', atributos: { role: 'presentation' } }, [
    crearElemento('span', { clase: 'barra-cat__relleno' })
  ]);
  barra.style.setProperty('--avance', porcentaje + '%');
  return crearElemento('article', { clase: 'resultado-tarjeta' }, [
    crearElemento('p', { clase: 'resultado-tarjeta__etiqueta', texto: 'Participación' }),
    crearElemento('p', { clase: 'resultado-tarjeta__valor', texto: participacion.votaron + ' de ' + participacion.total }),
    barra,
    crearElemento('p', { clase: 'resultado-tarjeta__nota', texto: porcentaje + '% de las personas ya votó' })
  ]);
}

function renderizarEstadoGanadora(datos) {
  const ganadora = datos.ganadora;
  const cerrada = datos.categoria.estado === 'cerrada';
  const titulo = (id) => {
    const item = datos.ranking.find((registro) => registro.propuestaId === id);
    return item ? item.titulo : '';
  };
  let etiqueta = cerrada ? 'Ganadora' : 'Va ganando';
  let valor = 'Aún no hay votos';
  let nota = '';
  if (ganadora.estado === 'definida') {
    valor = titulo(ganadora.ganadoraId);
  } else if (ganadora.estado === 'empate') {
    etiqueta = 'Empate';
    valor = ganadora.empatadas.map(titulo).join(' · ');
    nota = cerrada ? 'Pendiente de decisión del administrador.' : 'Empate por ahora.';
  }
  const tarjeta = crearElemento('article', { clase: 'resultado-tarjeta resultado-tarjeta--destacada' }, [
    crearElemento('p', { clase: 'resultado-tarjeta__etiqueta', texto: etiqueta }),
    crearElemento('p', { clase: 'resultado-tarjeta__valor', texto: valor })
  ]);
  if (nota) {
    tarjeta.appendChild(crearElemento('p', { clase: 'resultado-tarjeta__nota', texto: nota }));
  }
  return tarjeta;
}

function renderizarRanking(datos) {
  const maximo = Math.max(1, ...datos.ranking.map((item) => item.puntos));
  const puedeDesempatar = esAdminSesion() && datos.categoria.estado === 'cerrada' && datos.ganadora.estado === 'empate';
  const lista = crearElemento('ol', { clase: 'ranking-cat' });
  datos.ranking.forEach((item, indice) => {
    const fila = crearElemento('li', { clase: 'ranking-cat__item' + (item.propuestaId === datos.ganadora.ganadoraId ? ' ranking-cat__item--ganadora' : '') });
    const detalle = pluralizar(item.puntos, 'punto', 'puntos') + ' · ' + pluralizar(item.votantes, 'voto', 'votos') + (item.autor ? ' · ' + item.autor : '');
    const barra = crearElemento('div', { clase: 'barra-cat', atributos: { role: 'presentation' } }, [
      crearElemento('span', { clase: 'barra-cat__relleno' })
    ]);
    barra.style.setProperty('--avance', Math.round((item.puntos / maximo) * 100) + '%');
    fila.appendChild(crearElemento('span', { clase: 'ranking-cat__posicion', texto: String(indice + 1) }));
    fila.appendChild(crearElemento('div', { clase: 'ranking-cat__texto' }, [
      crearElemento('strong', { texto: item.titulo }),
      crearElemento('span', { texto: detalle }),
      barra
    ]));
    if (puedeDesempatar && datos.ganadora.empatadas.indexOf(item.propuestaId) !== -1) {
      const boton = crearElemento('button', { clase: 'boton boton--chico', texto: 'Elegir como ganadora', atributos: { type: 'button' } });
      boton.addEventListener('click', () => elegirGanadora(item.propuestaId));
      fila.appendChild(boton);
    }
    lista.appendChild(fila);
  });
  return lista;
}