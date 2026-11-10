function actualizarBloqueoDesplazamiento() {
  if (document.querySelector('dialog[open]')) {
    document.documentElement.setAttribute('data-modal-abierto', '');
  } else {
    document.documentElement.removeAttribute('data-modal-abierto');
  }
}

function crearModal(variante, idTitulo) {
  const modal = crearElemento('dialog', { clase: 'modal ' + variante, atributos: { 'aria-labelledby': idTitulo } });
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) {
      modal.close();
    }
  });
  modal.addEventListener('close', () => {
    modal.remove();
    actualizarBloqueoDesplazamiento();
  });
  return modal;
}

function abrirModal(modal) {
  document.body.appendChild(modal);
  modal.showModal();
  actualizarBloqueoDesplazamiento();
}

function confirmarAccion({ titulo, mensaje, textoConfirmar, peligro }) {
  return new Promise((resolver) => {
    const modal = crearModal('modal--confirmar', 'titulo-confirmar');
    let aceptado = false;
    const cancelar = crearElemento('button', {
      clase: 'boton boton--secundario',
      texto: 'Cancelar',
      atributos: { type: 'button' }
    });
    const confirmar = crearElemento('button', {
      clase: 'boton' + (peligro ? ' boton--peligro' : ''),
      texto: textoConfirmar,
      atributos: { type: 'button' }
    });
    cancelar.addEventListener('click', () => modal.close());
    confirmar.addEventListener('click', () => {
      aceptado = true;
      modal.close();
    });
    modal.addEventListener('close', () => resolver(aceptado));
    modal.appendChild(crearElemento('div', { clase: 'modal__cuerpo modal__cuerpo--confirmar' }, [
      crearElemento('span', { clase: 'modal__icono' + (peligro ? ' modal__icono--peligro' : '') }, [crearIcono('alerta')]),
      crearElemento('h2', { clase: 'modal__titulo', texto: titulo, atributos: { id: 'titulo-confirmar' } }),
      crearElemento('p', { clase: 'modal__texto', texto: mensaje }),
      crearElemento('div', { clase: 'modal__acciones' }, [cancelar, confirmar])
    ]));
    abrirModal(modal);
    cancelar.focus();
  });
}