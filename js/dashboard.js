let estadoDashboard = null;
let graficas = [];

const TONOS_CATEGORIA = ['olive', 'oro', 'cielo'];

function movimientoReducido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function destruirGraficas() {
  graficas.forEach((grafica) => grafica.destroy());
  graficas = [];
}

function formatearNumero(valor, decimales = 0) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(valor);
}

function pluralizar(cantidad, singular, plural) {
  return cantidad === 1 ? singular : plural;
}

function saludoSegunHora(fecha) {
  const hora = fecha.getHours();
  if (hora < 12) {
    return 'Buenos días';
  }
  return hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function formatearFechaLarga(fecha) {
  const texto = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function animarNumero(elemento) {
  const final = Number(elemento.dataset.valor);
  const decimales = Number(elemento.dataset.decimales);
  const sufijo = elemento.dataset.sufijo;
  if (movimientoReducido() || final === 0) {
    return;
  }
  elemento.textContent = formatearNumero(0, decimales) + sufijo;
  const duracion = 900;
  const inicio = performance.now();
  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const suavizado = 1 - Math.pow(1 - progreso, 3);
    elemento.textContent = formatearNumero(final * suavizado, decimales) + sufijo;
    if (progreso < 1) {
      requestAnimationFrame(paso);
    }
  }
  requestAnimationFrame(paso);
}

function animarNumeros(contenedor) {
  contenedor.querySelectorAll('[data-valor]').forEach(animarNumero);
}

function calcularMetricas(datos) {
  const totalCategorias = datos.porCategoria.length;
  const maximoVotos = datos.porCategoria.reduce((maximo, categoria) => Math.max(maximo, categoria.votos), 0);
  return {
    totalCategorias,
    maximoVotos,
    lideres: maximoVotos > 0 ? datos.porCategoria.filter((categoria) => categoria.votos === maximoVotos) : [],
    porcentaje: datos.totalUsuarios > 0 ? Math.round((datos.usuariosQueVotaron / datos.totalUsuarios) * 100) : 0,
    faltan: Math.max(datos.totalUsuarios - datos.usuariosQueVotaron, 0),
    votosPorPersona: datos.usuariosQueVotaron > 0 ? datos.totalVotos / datos.usuariosQueVotaron : 0,
    propuestasPorCategoria: totalCategorias > 0 ? datos.totalPropuestas / totalCategorias : 0
  };
}

function crearMetrica(definicion, orden) {
  const { titulo, valor, sufijo = '', decimales = 0, detalle, icono, tono, compacta = false } = definicion;
  const numerico = typeof valor === 'number';
  const elementoValor = crearElemento('p', {
    clase: 'metrica__valor' + (numerico ? '' : ' metrica__valor--texto'),
    texto: numerico ? formatearNumero(valor, decimales) + sufijo : valor
  });
  if (numerico) {
    elementoValor.dataset.valor = String(valor);
    elementoValor.dataset.decimales = String(decimales);
    elementoValor.dataset.sufijo = sufijo;
  }
  const tarjeta = crearElemento('article', {
    clase: 'metrica tono-' + tono + (compacta ? ' metrica--compacta' : '')
  }, [
    crearElemento('span', { clase: 'metrica__icono' }, [crearIcono(icono)]),
    crearElemento('p', { clase: 'metrica__titulo', texto: titulo }),
    elementoValor,
    crearElemento('p', { clase: 'metrica__detalle', texto: detalle })
  ]);
  tarjeta.style.setProperty('--orden', String(orden));
  return tarjeta;
}

function renderizarCabecera() {
  const ahora = new Date();
  const sesion = obtenerSesion();
  const abiertas = estadoDashboard.categoriasAbiertas;
  const textoChip = abiertas === 0
    ? 'Todas las categorías cerradas'
    : abiertas + ' ' + pluralizar(abiertas, 'categoría abierta', 'categorías abiertas');
  const chip = crearElemento('span', {
    clase: 'chip-estado' + (abiertas === 0 ? ' chip-estado--cerrado' : '')
  }, [
    crearIcono(abiertas === 0 ? 'candado' : 'circulo-check'),
    crearElemento('span', { texto: textoChip })
  ]);
  const actualizar = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    atributos: { type: 'button' }
  }, [
    crearIcono('actualizar'),
    crearElemento('span', { clase: 'boton__texto', texto: 'Actualizar' })
  ]);
  actualizar.addEventListener('click', () => actualizarDashboard(actualizar));
  return crearElemento('header', { clase: 'tablero__cabecera' }, [
    crearElemento('div', { clase: 'tablero__saludo' }, [
      crearElemento('h2', { texto: saludoSegunHora(ahora) + ', ' + primerNombre(sesion.nombre) }),
      crearElemento('p', { clase: 'tablero__fecha', texto: formatearFechaLarga(ahora) + ' · Así va la posada hoy' })
    ]),
    crearElemento('div', { clase: 'tablero__acciones' }, [chip, actualizar])
  ]);
}

function renderizarMetricas() {
  const datos = estadoDashboard;
  const metricas = calcularMetricas(datos);
  const definiciones = [
    {
      titulo: 'Participación',
      valor: metricas.porcentaje,
      sufijo: '%',
      detalle: datos.usuariosQueVotaron + ' de ' + datos.totalUsuarios + ' personas han votado',
      icono: 'usuarios',
      tono: 'olive'
    },
    {
      titulo: 'Propuestas',
      valor: datos.totalPropuestas,
      detalle: 'publicadas en ' + metricas.totalCategorias + ' ' + pluralizar(metricas.totalCategorias, 'categoría', 'categorías'),
      icono: 'foco',
      tono: 'oro'
    },
    {
      titulo: 'Votos emitidos',
      valor: datos.totalVotos,
      detalle: 'registrados en total',
      icono: 'voto',
      tono: 'cielo'
    },
    {
      titulo: 'Categorías abiertas',
      valor: datos.categoriasAbiertas,
      detalle: datos.categoriasCerradas + ' ' + pluralizar(datos.categoriasCerradas, 'cerrada', 'cerradas') + ' de ' + metricas.totalCategorias,
      icono: 'lista',
      tono: 'rosa'
    }
  ];
  return crearElemento(
    'section',
    { clase: 'metricas', atributos: { 'aria-label': 'Métricas principales' } },
    definiciones.map((definicion, indice) => crearMetrica(definicion, indice))
  );
}

function describirCategoriaActiva(metricas) {
  const base = { titulo: 'Categoría más activa', icono: 'tendencia', tono: 'olive', compacta: true };
  if (metricas.lideres.length === 0) {
    return { ...base, valor: 'Sin votos aún', detalle: 'Nadie ha votado todavía' };
  }
  if (metricas.lideres.length > 1) {
    return { ...base, valor: 'Varias categorías', detalle: 'Empatan con ' + metricas.maximoVotos + ' votos' };
  }
  return {
    ...base,
    valor: metricas.lideres[0].nombre,
    detalle: metricas.maximoVotos + ' ' + pluralizar(metricas.maximoVotos, 'voto', 'votos')
  };
}

function renderizarMetricasSecundarias() {
  const metricas = calcularMetricas(estadoDashboard);
  const definiciones = [
    {
      titulo: 'Faltan por votar',
      valor: metricas.faltan,
      detalle: pluralizar(metricas.faltan, 'persona sin votar', 'personas sin votar'),
      icono: 'reloj',
      tono: 'rosa',
      compacta: true
    },
    {
      titulo: 'Votos por persona',
      valor: metricas.votosPorPersona,
      decimales: 1,
      detalle: 'promedio entre quienes votaron',
      icono: 'grafica',
      tono: 'cielo',
      compacta: true
    },
    {
      titulo: 'Propuestas por categoría',
      valor: metricas.propuestasPorCategoria,
      decimales: 1,
      detalle: 'promedio general',
      icono: 'foco',
      tono: 'oro',
      compacta: true
    },
    describirCategoriaActiva(metricas)
  ];
  return crearElemento(
    'section',
    { clase: 'metricas', atributos: { 'aria-label': 'Métricas complementarias' } },
    definiciones.map((definicion, indice) => crearMetrica(definicion, indice + 4))
  );
}

function describirSituacion(categoria) {
  const faltan = Math.max(estadoDashboard.totalUsuarios - categoria.votaron, 0);
  if (categoria.estado !== 'abierta') {
    return 'Votación cerrada.';
  }
  if (categoria.propuestas === 0) {
    return 'Aún no hay propuestas.';
  }
  if (categoria.votaron === 0) {
    return 'Nadie ha votado todavía.';
  }
  if (faltan === 0) {
    return 'Todas las personas ya votaron.';
  }
  return faltan === 1 ? 'Falta 1 persona por votar.' : 'Faltan ' + faltan + ' personas por votar.';
}

function crearDato(titulo, valor) {
  return crearElemento('div', { clase: 'datos-categoria__item' }, [
    crearElemento('dt', { texto: titulo }),
    crearElemento('dd', { texto: valor })
  ]);
}

function crearTarjetaCategoria(categoria, indice, orden) {
  const total = estadoDashboard.totalUsuarios;
  const abierta = categoria.estado === 'abierta';
  const porcentaje = total > 0 ? Math.round((categoria.votaron / total) * 100) : 0;
  const barra = crearElemento('span', { clase: 'progreso__barra' });
  barra.style.setProperty('--valor', porcentaje + '%');
  const pista = crearElemento('div', {
    clase: 'progreso__pista',
    atributos: {
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(porcentaje),
      'aria-label': 'Participación en ' + categoria.nombre
    }
  }, [barra]);
  const ver = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    atributos: { type: 'button' }
  }, [
    crearElemento('span', { texto: 'Ver categoría' }),
    crearIcono('flecha')
  ]);
  ver.addEventListener('click', () => seleccionarCategoria(categoria.id, true));
  const tarjeta = crearElemento('article', {
    clase: 'categoria-tarjeta tono-' + TONOS_CATEGORIA[indice % TONOS_CATEGORIA.length]
  }, [
    crearElemento('header', { clase: 'categoria-tarjeta__cabecera' }, [
      crearElemento('span', { clase: 'metrica__icono' }, [crearIcono(iconoDeCategoria(categoria.nombre))]),
      crearElemento('h3', { clase: 'categoria-tarjeta__nombre', texto: categoria.nombre }),
      crearElemento('span', {
        clase: 'insignia ' + (abierta ? 'insignia--abierta' : 'insignia--cerrada'),
        texto: abierta ? 'Abierta' : 'Cerrada'
      })
    ]),
    crearElemento('dl', { clase: 'datos-categoria' }, [
      crearDato('Propuestas', String(categoria.propuestas)),
      crearDato('Votos', String(categoria.votos)),
      crearDato('Votaron', categoria.votaron + ' de ' + total)
    ]),
    crearElemento('div', { clase: 'progreso' }, [
      crearElemento('p', { clase: 'progreso__texto' }, [
        crearElemento('span', { texto: 'Participación' }),
        crearElemento('strong', { texto: porcentaje + '%' })
      ]),
      pista
    ]),
    crearElemento('p', { clase: 'categoria-tarjeta__nota', texto: describirSituacion(categoria) }),
    ver
  ]);
  tarjeta.style.setProperty('--orden', String(orden));
  return tarjeta;
}

function renderizarCategorias() {
  return crearElemento(
    'section',
    { clase: 'categorias-tablero', atributos: { 'aria-label': 'Estado por categoría' } },
    estadoDashboard.porCategoria.map((categoria, indice) => crearTarjetaCategoria(categoria, indice, indice + 6))
  );
}

function describirActividad() {
  return estadoDashboard.porCategoria
    .map((categoria) => categoria.nombre + ': ' + categoria.propuestas + ' propuestas, ' + categoria.votos + ' votos y ' + categoria.votaron + ' personas que votaron')
    .join('. ');
}

function crearContenedorGrafica(identificador, titulo, descripcion, descripcionAccesible, orden) {
  const seccion = crearElemento('section', {
    clase: 'grafica',
    atributos: { 'aria-labelledby': identificador + '-titulo' }
  }, [
    crearElemento('div', { clase: 'grafica__cabecera' }, [
      crearElemento('h3', { texto: titulo, atributos: { id: identificador + '-titulo' } }),
      crearElemento('p', { texto: descripcion })
    ]),
    crearElemento('div', { atributos: { id: identificador, role: 'img', 'aria-label': descripcionAccesible } })
  ]);
  seccion.style.setProperty('--orden', String(orden));
  return seccion;
}

function renderizarZonaGraficas() {
  const datos = estadoDashboard;
  if (datos.totalPropuestas === 0 && datos.totalVotos === 0) {
    return crearElemento('section', { clase: 'estado-vacio' }, [
      crearIcono('grafica'),
      crearElemento('h3', { texto: 'Aún no hay actividad' }),
      crearElemento('p', { texto: 'Cuando se publiquen propuestas y empiecen los votos, aquí verás las gráficas.' })
    ]);
  }
  return crearElemento('section', { clase: 'graficas', atributos: { 'aria-label': 'Gráficas' } }, [
    crearContenedorGrafica(
      'grafica-actividad',
      'Actividad por categoría',
      'Propuestas, votos y personas que votaron',
      'Gráfica de barras. ' + describirActividad(),
      9
    ),
    crearContenedorGrafica(
      'grafica-participacion',
      'Participación general',
      'Quiénes ya votaron y quiénes faltan',
      'Participación: ' + datos.usuariosQueVotaron + ' de ' + datos.totalUsuarios + ' personas han votado.',
      10
    )
  ]);
}

function renderizarDashboard() {
  const contenido = document.getElementById('contenido');
  destruirGraficas();
  vaciar(contenido);
  const tablero = crearElemento('div', { clase: 'tablero' }, [
    renderizarCabecera(),
    renderizarMetricas(),
    renderizarMetricasSecundarias(),
    renderizarCategorias(),
    renderizarZonaGraficas()
  ]);
  contenido.appendChild(tablero);
  animarNumeros(tablero);
  renderizarGraficas();
}

function renderizarErrorDashboard(contenido, mensaje) {
  vaciar(contenido);
  const reintentar = crearElemento('button', {
    clase: 'boton boton--secundario boton--chico',
    texto: 'Reintentar',
    atributos: { type: 'button' }
  });
  reintentar.addEventListener('click', () => seleccionarDashboard());
  contenido.appendChild(crearElemento('div', { clase: 'estado-vacio', atributos: { role: 'alert' } }, [
    crearIcono('alerta'),
    crearElemento('h2', { texto: 'No pudimos cargar el dashboard' }),
    crearElemento('p', { texto: mensaje }),
    reintentar
  ]));
}

async function cargarDashboard() {
  const contenido = document.getElementById('contenido');
  try {
    const datos = await llamarApi('resumenDashboard', {}, { conSesion: true });
    if (vistaActiva !== 'dashboard') {
      return;
    }
    estadoDashboard = datos;
    renderizarDashboard();
  } catch (error) {
    if (vistaActiva !== 'dashboard') {
      return;
    }
    renderizarErrorDashboard(contenido, error.message);
  }
}

async function actualizarDashboard(boton) {
  establecerCargando(boton, true, 'Actualizando…');
  try {
    const datos = await llamarApi('resumenDashboard', {}, { conSesion: true });
    if (vistaActiva !== 'dashboard') {
      return;
    }
    estadoDashboard = datos;
    renderizarDashboard();
    mostrarAviso('Datos actualizados.');
  } catch (error) {
    establecerCargando(boton, false);
    mostrarAviso(error.message, true);
  }
}

function leerColor(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

function opcionesBase(altura) {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  return {
    chart: {
      height: altura,
      background: 'transparent',
      foreColor: leerColor('--color-texto-suave'),
      fontFamily: 'inherit',
      toolbar: { show: false },
      animations: { enabled: !movimientoReducido() }
    },
    theme: { mode: oscuro ? 'dark' : 'light' },
    grid: { borderColor: leerColor('--color-borde'), strokeDashArray: 4 },
    tooltip: { theme: oscuro ? 'dark' : 'light' }
  };
}

function crearGraficaActividad() {
  const base = opcionesBase(320);
  const filas = estadoDashboard.porCategoria;
  const opciones = {
    ...base,
    chart: { ...base.chart, type: 'bar' },
    series: [
      { name: 'Propuestas', data: filas.map((fila) => fila.propuestas) },
      { name: 'Votos', data: filas.map((fila) => fila.votos) },
      { name: 'Personas que votaron', data: filas.map((fila) => fila.votaron) }
    ],
    xaxis: {
      categories: filas.map((fila) => fila.nombre),
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (valor) => String(Math.round(valor)) } },
    colors: [leerColor('--color-boton'), leerColor('--color-oro'), leerColor('--color-cielo')],
    plotOptions: { bar: { borderRadius: 8, borderRadiusApplication: 'end', columnWidth: '58%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ['transparent'] },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      markers: { radius: 12 },
      labels: { colors: leerColor('--color-texto') }
    },
    tooltip: { ...base.tooltip, shared: true, intersect: false }
  };
  const grafica = new ApexCharts(document.getElementById('grafica-actividad'), opciones);
  grafica.render();
  graficas.push(grafica);
}

function crearGraficaParticipacion() {
  const base = opcionesBase(320);
  const votaron = estadoDashboard.usuariosQueVotaron;
  const total = estadoDashboard.totalUsuarios;
  const porcentaje = total > 0 ? Math.round((votaron / total) * 100) : 0;
  const opciones = {
    ...base,
    chart: { ...base.chart, type: 'donut' },
    series: [votaron, Math.max(total - votaron, 0)],
    labels: ['Han votado', 'Faltan por votar'],
    colors: [leerColor('--color-boton'), leerColor('--color-borde-fuerte')],
    stroke: { width: 4, colors: [leerColor('--color-tarjeta')] },
    legend: {
      position: 'bottom',
      markers: { radius: 12 },
      labels: { colors: leerColor('--color-texto') }
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '74%',
          labels: {
            show: true,
            name: { fontSize: '14px', fontWeight: 600, color: leerColor('--color-texto-suave') },
            value: { fontSize: '30px', fontWeight: 800, color: leerColor('--color-texto'), offsetY: 6 },
            total: {
              show: true,
              showAlways: true,
              label: 'Participación',
              color: leerColor('--color-texto-suave'),
              formatter: () => porcentaje + '%'
            }
          }
        }
      }
    }
  };
  const grafica = new ApexCharts(document.getElementById('grafica-participacion'), opciones);
  grafica.render();
  graficas.push(grafica);
}

function renderizarGraficas() {
  destruirGraficas();
  const zonas = ['grafica-actividad', 'grafica-participacion'].map((id) => document.getElementById(id));
  if (zonas.some((zona) => !zona)) {
    return;
  }
  zonas.forEach(vaciar);
  if (typeof ApexCharts === 'undefined') {
    zonas.forEach((zona) => zona.appendChild(crearElemento('p', {
      clase: 'categoria__dato',
      texto: 'No se pudieron cargar las gráficas. Los datos están en las tarjetas de arriba.'
    })));
    return;
  }
  crearGraficaActividad();
  crearGraficaParticipacion();
}

function iniciarObservadorTema() {
  new MutationObserver(() => {
    if (vistaActiva === 'dashboard' && estadoDashboard) {
      renderizarGraficas();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
}