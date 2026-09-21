/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Rampas de vis COMPARTILHADAS
 * ---------------------------------------------------------------------------
 * Camadas que medem QUANTIDADE POR ÁREA (densidade: t/ha, Mg/ha, t C/ha,
 * Mg C/ha) usam a MESMA rampa (min/max/paleta) — `AREA` — para comparação
 * direta entre resultados, referências e auxiliares.
 *
 * `ERR` é a rampa de incerteza (t C/ha), usada onde a magnitude é 'incerteza'.
 ******************************************************************************/

/** Quantidade por área (densidade de biomassa/carbono) — rampa única. */
exports.AREA = { min: 0, max: 300,
  palette: ['#ffffe5', '#d9f0a3', '#78c679', '#238443', '#004529'] };

/** Incerteza (t C/ha). */
exports.ERR = { min: 0, max: 60,
  palette: ['#fff7bc', '#fec44f', '#d95f0e', '#993404'] };
