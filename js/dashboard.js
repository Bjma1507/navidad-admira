let estadoDashboard = null;
let graficas = [];

function destruirGraficas() {
  graficas.forEach((grafica) => grafica.destroy());
  graficas = [];
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
    vaciar(contenido);
    contenido.appendChild(crearElemento('p', { clase: 'mensaje', texto: error.message, atributos: { role: 'alert' } }));
  }
}

function crearIndicador(titulo, valor, detalle) {
  return crearElemento('article', { clase: 'indicador' }, [
    crearElemento('p', { clase: 'indicador__titulo', texto: titulo }),
    crearElemento('p', { clase: 'indicador__valor', texto: valor }),
    crearElemento('p', { clase: 'indicador__detalle', texto: detalle })
  ]);
}

function renderizarIndicadores() {
  const datos = estadoDashboard;
  const porcentaje = datos.totalUsuarios > 0 ? Math.round((datos.usuariosQueVotaron / datos.totalUsuarios) * 100) : 0;
  const rejilla = crearElemento('div', { clase: 'indicadores' });
  rejilla.appendChild(crearIndicador('Participación', porcentaje + '%', datos.usuariosQueVotaron + ' de ' + datos.totalUsuarios + ' personas han votado'));
  rejilla.appendChild(crearIndicador('Propuestas', String(datos.totalPropuestas), 'publicadas en total'));
  rejilla.appendChild(crearIndicador('Votos', String(datos.totalVotos), 'emitidos en total'));
  rejilla.appendChild(crearIndicador('Categorías', datos.categoriasAbiertas + ' abiertas', datos.categoriasCerradas + ' cerradas'));
  return rejilla;
}

function crearContenedorGrafica(identificador, titulo) {
  return crearElemento('section', { clase: 'grafica', atributos: { 'aria-label': titulo } }, [
    crearElemento('h3', { texto: titulo }),
    crearElemento('div', { atributos: { id: identificador } })
  ]);
}

function renderizarTablaCategorias() {
  const tabla = crearElemento('table', { clase: 'tabla' });
  const encabezado = crearElemento('tr');
  ['Categoría', 'Estado', 'Propuestas', 'Votaron'].forEach((texto) => {
    encabezado.appendChild(crearElemento('th', { texto, atributos: { scope: 'col' } }));
  });
  tabla.appendChild(crearElemento('thead', {}, [encabezado]));
  const cuerpo = crearElemento('tbody');
  estadoDashboard.porCategoria.forEach((categoria) => {
    cuerpo.appendChild(crearElemento('tr', {}, [
      crearElemento('th', { texto: categoria.nombre, atributos: { scope: 'row' } }),
      crearElemento('td', { texto: categoria.estado === 'abierta' ? 'Abierta' : 'Cerrada' }),
      crearElemento('td', { texto: String(categoria.propuestas) }),
      crearElemento('td', { texto: categoria.votaron + ' de ' + estadoDashboard.totalUsuarios })
    ]));
  });
  tabla.appendChild(cuerpo);
  return crearElemento('div', { clase: 'tabla__contenedor' }, [tabla]);
}

function renderizarDashboard() {
  const contenido = document.getElementById('contenido');
  destruirGraficas();
  vaciar(contenido);
  contenido.appendChild(crearElemento('h2', { texto: 'Dashboard' }));
  contenido.appendChild(renderizarIndicadores());
  const graficasZona = crearElemento('div', { clase: 'graficas' });
  graficasZona.appendChild(crearContenedorGrafica('grafica-propuestas', 'Propuestas por categoría'));
  graficasZona.appendChild(crearContenedorGrafica('grafica-participacion', 'Participación general'));
  contenido.appendChild(graficasZona);
  contenido.appendChild(renderizarTablaCategorias());
  renderizarGraficas();
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
      foreColor: leerColor('--color-texto'),
      fontFamily: 'inherit',
      toolbar: { show: false },
      animations: { enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }
    },
    theme: { mode: oscuro ? 'dark' : 'light' },
    grid: { borderColor: leerColor('--color-borde') }
  };
}

function crearGraficaPropuestas() {
  const base = opcionesBase(280);
  const porCategoria = estadoDashboard.porCategoria;
  const opciones = {
    ...base,
    chart: { ...base.chart, type: 'bar' },
    series: [{ name: 'Propuestas', data: porCategoria.map((c) => c.propuestas) }],
    xaxis: { categories: porCategoria.map((c) => c.nombre) },
    yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (valor) => String(Math.round(valor)) } },
    colors: [leerColor('--color-boton')],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    dataLabels: { enabled: true },
    legend: { show: false }
  };
  const grafica = new ApexCharts(document.getElementById('grafica-propuestas'), opciones);
  grafica.render();
  graficas.push(grafica);
}

function crearGraficaParticipacion() {
  const base = opcionesBase(280);
  const votaron = estadoDashboard.usuariosQueVotaron;
  const total = estadoDashboard.totalUsuarios;
  const opciones = {
    ...base,
    chart: { ...base.chart, type: 'donut' },
    series: [votaron, Math.max(total - votaron, 0)],
    labels: ['Han votado', 'Faltan por votar'],
    colors: [leerColor('--color-boton'), leerColor('--color-borde-fuerte')],
    stroke: { colors: [leerColor('--color-superficie')] },
    legend: { position: 'bottom' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: { show: true, label: 'Participación', formatter: () => votaron + ' de ' + total }
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
  const zonas = ['grafica-propuestas', 'grafica-participacion'].map((id) => document.getElementById(id));
  if (zonas.some((zona) => !zona)) {
    return;
  }
  zonas.forEach(vaciar);
  if (typeof ApexCharts === 'undefined') {
    zonas.forEach((zona) => zona.appendChild(crearElemento('p', {
      clase: 'categoria__dato',
      texto: 'No se pudieron cargar las gráficas. Los datos están en la tabla de abajo.'
    })));
    return;
  }
  crearGraficaPropuestas();
  crearGraficaParticipacion();
}

function iniciarObservadorTema() {
  new MutationObserver(() => {
    if (vistaActiva === 'dashboard' && estadoDashboard) {
      renderizarGraficas();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
}