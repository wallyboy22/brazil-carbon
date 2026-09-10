// =========================================================================
// ANPP MENSAL — CAMPO NATURAL DO BIOMA PANTANAL
// Adaptação v00 a partir do protótipo original do Pampa.
// ORIGINAL (PAMPA): ANPP MENSAL — CAMPO NATURAL DO BIOMA PAMPA
// -------------------------------------------------------------------------
// Modelo de Monteith (1977): ANPP = εCA × ΣPARa
//   PARa  = fPAR × PAR_incidente  (MJ/m²)
//   PAR   = DSR × 0,48            (fração fotossinteticamente ativa)
//   fPAR  = MODIS MCD15A3H × 0,01 (fração, adimensional)
//   DSR   = MODIS MCD18A1         (W/m² → MJ/m²/dia: × 86400 × 1e-6)
//   εCA   = eficiência mensal (gMS/MJ) — ORIGINAL calibrada para campo do
//           Pampa; mantida como hipótese provisória para o Pantanal (ver v01)
// Resultado: ANPP em kg MS/ha/mês  (g/m²/mês × 10)
// Landsat harmonizado L5+L7+L8+L9 (Roy et al. 2016) — biomassa de referência
// Máscara: campo natural Pantanal, MapBiomas col.11, classes 11, 12 e 50
// ORIGINAL (PAMPA): Máscara: campo natural Pampa, MapBiomas col.10.1, classes 12 e 50
// =========================================================================

// =========================================================================
// 1. CONFIGURAÇÃO — ALTERE APENAS AQUI
// =========================================================================
var anoAlvo = 2023;  // >= 2000 (início do MODIS) | ORIGINAL (PAMPA): var anoAlvo = 2021;

// =========================================================================
// 2. EFICIÊNCIA DE CONVERSÃO εCA (gMS · MJ⁻¹) — tabela mensal
//    ORIGINAL (PAMPA): valores calibrados para o campo do Pampa.
//    Mantidos no Pantanal como hipótese provisória — calibração em v02+.
//    Abril interpolado: média(Março=0,315 ; Maio=0,257) = 0,286
// =========================================================================
var eca = {
  1:  0.263,   // Janeiro
  2:  0.347,   // Fevereiro
  3:  0.315,   // Março
  4:  0.286,   // Abril — interpolado
  5:  0.257,   // Maio
  6:  0.154,   // Junho
  7:  0.083,   // Julho
  8:  0.091,   // Agosto
  9:  0.272,   // Setembro
  10: 0.291,   // Outubro
  11: 0.211,   // Novembro
  12: 0.233    // Dezembro
};

// =========================================================================
// 3. MÁSCARA DO CAMPO NATURAL DO BIOMA PANTANAL (MapBiomas col.11)
//    ORIGINAL (PAMPA): MÁSCARA DO CAMPO NATURAL DO BIOMA PAMPA (col.10.1)
// =========================================================================
var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil_old')
  .filterMetadata('Bioma', 'equals', 'Pantanal');
// ORIGINAL (PAMPA): .filterMetadata('Bioma', 'equals', 'Pampa');
// Nota: a v01 usa 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026' (ver 0_contract).

var aoi = biomas.geometry();

var bioma_raster = ee.Image().uint32()
  .paint({featureCollection: biomas, color: 'CD_Bioma'})
  .rename('Bioma');

var dirCol = 'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
             'mapbiomas_brazil_collection11_coverage_v3';
// ORIGINAL (PAMPA): 'projects/mapbiomas-public/assets/brazil/lulc/collection10_1/mapbiomas_brazil_collection10_1_coverage_v1';
var colecao_MB = ee.Image(dirCol)
  .updateMask(bioma_raster)
  .select('classification_' + anoAlvo);

// Classes 11 (área úmida), 12 (formação campestre) e 50 (restinga herbácea)
var campo_Pantanal = colecao_MB.eq(11).or(colecao_MB.eq(12)).or(colecao_MB.eq(50)).selfMask();
// ORIGINAL (PAMPA): Classes 12 (formação campestre) e 50 (restinga herbácea)
// ORIGINAL (PAMPA): var campo_Pampa = colecao_MB.eq(12).or(colecao_MB.eq(50)).selfMask();

print('Máscara: classification_' + anoAlvo + ' | classes 11, 12 e 50');
// ORIGINAL (PAMPA): print('Máscara: classification_' + anoAlvo + ' | classes 12 e 50');

// =========================================================================
// 4. PRÉ-PROCESSAMENTO LANDSAT HARMONIZADO (L5 / L7 / L8 / L9)
//    Mantido para referência — biomassa log-linear de Fonseca et al.
// =========================================================================
var nomes  = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
var slopes = ee.Image.constant([0.8474, 0.8483, 0.9047, 0.8462, 0.8937, 0.9071]).rename(nomes);
var itcps  = ee.Image.constant([0.0003, 0.0088, 0.0061, 0.0412, 0.0254, 0.0172]).rename(nomes);

function mascara_nuvem(image) {
  var qa = image.select('QA_PIXEL');
  return image.updateMask(
    qa.bitwiseAnd(1 << 1).eq(0)
     .and(qa.bitwiseAnd(1 << 2).eq(0))
     .and(qa.bitwiseAnd(1 << 3).eq(0))
     .and(qa.bitwiseAnd(1 << 4).eq(0))
  );
}
function prep_tm_etm(image) {
  image = mascara_nuvem(image);
  return image.select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'], nomes)
    .multiply(0.0000275).add(-0.2)
    .copyProperties(image, image.propertyNames());
}
function prep_oli(image) {
  image = mascara_nuvem(image);
  var refl = image.select(['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'], nomes)
    .multiply(0.0000275).add(-0.2);
  return refl.subtract(itcps).divide(slopes)
    .copyProperties(image, image.propertyNames());
}
function add_biomassa(image) {
  var bio = image.expression(
    'exp(5.8195 + 26.1616 * red + 21.6240 * swir1 - 48.9521 * swir2)',
    { 'red': image.select('red'), 'swir1': image.select('swir1'), 'swir2': image.select('swir2') }
  ).rename('biomassa');
  return image.addBands(bio).copyProperties(image, image.propertyNames());
}

// =========================================================================
// 5. FUNÇÃO: BIOMASSA MÉDIA MENSAL (Landsat, recortada ao campo Pantanal)
//    ORIGINAL (PAMPA): ... recortada ao campo Pampa
// =========================================================================
function biomassaMensal(mes) {
  var dataIni = ee.Date.fromYMD(anoAlvo, mes, 1);
  var dataFim = dataIni.advance(1, 'month');
  var nomeBanda = 'biomassa_' + mes;

  function filtra(col) {
    return col.filterBounds(aoi).filterDate(dataIni, dataFim)
              .filter(ee.Filter.lt('CLOUD_COVER', 40));
  }
  var col = filtra(ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')).map(prep_tm_etm)
    .merge(filtra(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')).map(prep_tm_etm))
    .merge(filtra(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')).map(prep_oli))
    .merge(filtra(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')).map(prep_oli))
    .map(add_biomassa);

  var img = ee.Image(ee.Algorithms.If(
    col.size().gt(0),
    col.select('biomassa').mean().updateMask(campo_Pantanal).rename(nomeBanda),
    ee.Image.constant(-9999).rename(nomeBanda).selfMask()
  ));
  return img.set('system:time_start', dataIni.millis()).set('mes', mes);
}

// =========================================================================
// 6. FUNÇÃO: PARa ACUMULADA MENSAL (MJ/m²/mês)
//    PARa = Σ [ fPAR × (DSR × 0,48) ]  somado sobre as composições do mês
//
//    Passo a passo por imagem MODIS de 4 dias:
//      1. DSR (W/m²) → MJ/m²/dia : × 86400 × 1e-6
//      2. PAR = DSR_MJ × 0,48
//      3. fPAR = Fpar × 0,01  (escala oficial MCD15A3H)
//      4. PARa_i = fPAR × PAR  (MJ/m²/dia, para aquela composição)
//      5. Acumula no mês: .sum()  → MJ/m²/mês
//
//    Reamostragem: fPAR (500 m) é reprojetado para a grade do DSR (1 km)
//    com resampleBilinear() antes da multiplicação.
// =========================================================================
function paraMensal(mes) {
  var dataIni = ee.Date.fromYMD(anoAlvo, mes, 1);
  var dataFim = dataIni.advance(1, 'month');
  var nomeBanda = 'para_' + mes;

  // Coleção fPAR (4 dias, 500 m)
  var colFpar = ee.ImageCollection('MODIS/061/MCD15A3H')
    .filterDate(dataIni, dataFim)
    .select('Fpar');

  // Coleção DSR (diária, 1 km)
  var colDsr = ee.ImageCollection('MODIS/061/MCD18A1')
    .filterDate(dataIni, dataFim)
    .select('DSR');

  // Para cada composição fPAR de 4 dias, usa o DSR médio dos 4 dias
  // e calcula PARa = fPAR × PAR
  var colPara = colFpar.map(function(imgFpar) {
    var t     = imgFpar.date();
    var tFim  = t.advance(4, 'day');

    // DSR médio dos 4 dias da composição → MJ/m²/dia
    var dsrMedio = colDsr.filterDate(t, tFim).mean()
      .multiply(86400).multiply(1e-6);   // W/m² → MJ/m²/dia

    // PAR incidente = DSR × 0,48
    var par = dsrMedio.multiply(0.48);

    // fPAR escalonado (0–1), reamostrado para 1 km (grade do DSR)
    var fpar = imgFpar.multiply(0.01)
      .resample('bilinear')
      .reproject({crs: dsrMedio.projection()});

    // PARa da composição (MJ/m²/período de 4 dias)
    var para = fpar.multiply(par)
      .multiply(4)                       // × 4 dias da composição
      .rename('para');

    return para.set('system:time_start', imgFpar.get('system:time_start'));
  });

  // Soma todas as composições do mês → MJ/m²/mês
  var soma = colPara.sum()
    .updateMask(campo_Pantanal)
    .rename(nomeBanda);

  return soma.set('system:time_start', dataIni.millis()).set('mes', mes);
}

// =========================================================================
// 7. FUNÇÃO: ANPP MENSAL (kg MS/ha/mês)
//    ANPP = εCA × ΣPARa   (Equação 2.4)
//      εCA  em gMS/MJ
//      PARa em MJ/m²/mês
//    → resultado em gMS/m²/mês → × 10 → kg MS/ha/mês
// =========================================================================
function anppMensal(mes) {
  var nomeBanda = 'anpp_' + mes;
  var imgPara   = paraMensal(mes);
  var ecaMes    = eca[mes];              // gMS/MJ (constante escalar)

  var anpp = imgPara.select('para_' + mes)
    .multiply(ecaMes)                    // gMS/m²/mês
    .multiply(10)                        // → kg MS/ha/mês  (1 g/m² = 10 kg/ha)
    .rename(nomeBanda)
    .set('system:time_start', imgPara.get('system:time_start'))
    .set('mes', mes);

  return anpp;
}

// =========================================================================
// 8. GERAÇÃO DAS 12 IMAGENS MENSAIS
// =========================================================================
var meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

var listaBio  = meses.map(function(m) { return biomassaMensal(m); });
var listaPara = meses.map(function(m) { return paraMensal(m); });
var listaAnpp = meses.map(function(m) { return anppMensal(m); });

// =========================================================================
// 9. VISUALIZAÇÃO — Map.addLayer dos 12 meses
//    Todos desativados por padrão, ative no painel de layers
// =========================================================================
var labelsMes = ['01-Jan','02-Fev','03-Mar','04-Abr','05-Mai','06-Jun',
                 '07-Jul','08-Ago','09-Set','10-Out','11-Nov','12-Dez'];

// Paletas
var bioVis  = {min: 400,  max: 1500,
  palette: ['ffffcc','f7e77a','e5d21e','c4d92e','9bcb3c','6cba3d','41ab5d','238443','005a32']};

var paraVis = {min: 200, max: 600,
  palette: ['fff7fb','ece2f0','d0d1e6','a6bddb','67a9cf','3690c0','02818a','016450']};

var anppVis = {min: 200, max: 2000,
  palette: ['ffffcc','f7e77a','e5d21e','c4d92e','9bcb3c','6cba3d','41ab5d','238443','005a32']};

// --- Biomassa Landsat (kg/ha — referência) ---
Map.addLayer(listaBio[0],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[0],  false);
Map.addLayer(listaBio[1],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[1],  false);
Map.addLayer(listaBio[2],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[2],  false);
Map.addLayer(listaBio[3],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[3],  false);
Map.addLayer(listaBio[4],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[4],  false);
Map.addLayer(listaBio[5],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[5],  false);
Map.addLayer(listaBio[6],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[6],  false);
Map.addLayer(listaBio[7],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[7],  false);
Map.addLayer(listaBio[8],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[8],  false);
Map.addLayer(listaBio[9],  bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[9],  false);
Map.addLayer(listaBio[10], bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[10], false);
Map.addLayer(listaBio[11], bioVis, 'Biomassa ' + anoAlvo + '-' + labelsMes[11], false);

// --- PARa acumulada mensal (MJ/m²/mês) ---
Map.addLayer(listaPara[0],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[0],  false);
Map.addLayer(listaPara[1],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[1],  false);
Map.addLayer(listaPara[2],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[2],  false);
Map.addLayer(listaPara[3],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[3],  false);
Map.addLayer(listaPara[4],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[4],  false);
Map.addLayer(listaPara[5],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[5],  false);
Map.addLayer(listaPara[6],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[6],  false);
Map.addLayer(listaPara[7],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[7],  false);
Map.addLayer(listaPara[8],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[8],  false);
Map.addLayer(listaPara[9],  paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[9],  false);
Map.addLayer(listaPara[10], paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[10], false);
Map.addLayer(listaPara[11], paraVis, 'PARa ' + anoAlvo + '-' + labelsMes[11], false);

// --- ANPP mensal (kg MS/ha/mês) — produto final ---
Map.addLayer(listaAnpp[0],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[0],  false);
Map.addLayer(listaAnpp[1],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[1],  false);
Map.addLayer(listaAnpp[2],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[2],  false);
Map.addLayer(listaAnpp[3],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[3],  false);
Map.addLayer(listaAnpp[4],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[4],  false);
Map.addLayer(listaAnpp[5],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[5],  false);
Map.addLayer(listaAnpp[6],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[6],  false);
Map.addLayer(listaAnpp[7],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[7],  false);
Map.addLayer(listaAnpp[8],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[8],  false);
Map.addLayer(listaAnpp[9],  anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[9],  false);
Map.addLayer(listaAnpp[10], anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[10], false);
Map.addLayer(listaAnpp[11], anppVis, 'ANPP ' + anoAlvo + '-' + labelsMes[11], false);

// Máscara campo Pantanal para referência visual
Map.addLayer(campo_Pantanal.selfMask(), {palette: ['d4e6c3']}, 'Campo Pantanal ' + anoAlvo, false);
// ORIGINAL (PAMPA): Map.addLayer(campo_Pampa.selfMask(), {palette: ['d4e6c3']}, 'Campo Pampa ' + anoAlvo, false);

Map.setCenter(-57.0, -18.0, 8);
// ORIGINAL (PAMPA): Map.setCenter(-53.5953, -30.5429, 8);

// =========================================================================
// 10. LOG DE CONTROLE
// =========================================================================
print('=== Configurações ===');
print('Ano-alvo:', anoAlvo);
print('Máscara: campo Pantanal — classes 11+12+50, MapBiomas col.11, classification_' + anoAlvo);
// ORIGINAL (PAMPA): print('Máscara: campo Pampa — classes 12+50, MapBiomas col.10.1, classification_' + anoAlvo);
print('PARa = fPAR (MCD15A3H×0,01) × DSR (MCD18A1×86400×1e-6) × 0,48 × 4 dias | soma mensal');
print('ANPP = εCA × ΣPARa | resultado em kg MS/ha/mês');
print('εCA: valores do Pampa mantidos no Pantanal (hipótese provisória — calibração em v02+)');
print('εCA abril: interpolado (média março=0,315 e maio=0,257) = 0,286 gMS/MJ');
print('Landsat: L5+L7+L8+L9 harmonizado Roy et al. (2016) — biomassa Fonseca et al.');

// =========================================================================
// 11. BIOMASSA + ANPP MENSAL e SOMA ANUAL DA PRODUÇÃO
//    BioAnpp_mes = Biomassa_mes (kg/ha) + ANPP_mes (kg MS/ha/mês)
//    Representa o estoque atual + produção do período em cada pixel.
//    A soma dos 12 meses = produção integrada anual do bioma (kg MS/ha/ano).
// =========================================================================
var listaBioAnpp = meses.map(function(m) {
  var nomeBanda = 'bioanpp_' + m;
  var dataIni   = ee.Date.fromYMD(anoAlvo, m, 1);

  // Renomeia bandas para permitir a soma entre imagens
  var bio  = listaBio[m - 1].select(['biomassa_' + m], ['bio_temp']);
  var anpp = listaAnpp[m - 1].select(['anpp_' + m],    ['anpp_temp']);

  // Soma pixel a pixel — mesma unidade: kg MS/ha
  return bio.add(anpp)
    .updateMask(campo_Pantanal)
    .rename(nomeBanda)
    .set('system:time_start', dataIni.millis())
    .set('mes', m);
});
/*
// Soma anual: integra os 12 meses → representa a produção total do bioma (kg MS/ha/ano)
var colBioAnpp    = ee.ImageCollection.fromImages(listaBioAnpp);
var producaoAnual = colBioAnpp.sum()
  .updateMask(campo_Pantanal)
  .rename('producao_anual_' + anoAlvo);*/

// =========================================================================
// VISUALIZAÇÃO DAS NOVAS CAMADAS
// =========================================================================
var bioAnppVis = {min: 800, max: 3000,
  palette: ['ffffcc','f7e77a','e5d21e','c4d92e','9bcb3c','6cba3d','41ab5d','238443','005a32']};
/*
var producaoVis = {min: 2000, max: 40000,
  palette: ['ffffcc','fee08b','fdae61','f46d43','d73027','a50026','67001f']};
*/
// --- Biomassa + ANPP mensais (kg MS/ha) ---
Map.addLayer(listaBioAnpp[0],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-01-Jan', false);
Map.addLayer(listaBioAnpp[1],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-02-Fev', false);
Map.addLayer(listaBioAnpp[2],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-03-Mar', false);
Map.addLayer(listaBioAnpp[3],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-04-Abr', false);
Map.addLayer(listaBioAnpp[4],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-05-Mai', false);
Map.addLayer(listaBioAnpp[5],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-06-Jun', false);
Map.addLayer(listaBioAnpp[6],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-07-Jul', false);
Map.addLayer(listaBioAnpp[7],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-08-Ago', false);
Map.addLayer(listaBioAnpp[8],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-09-Set', false);
Map.addLayer(listaBioAnpp[9],  bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-10-Out', false);
Map.addLayer(listaBioAnpp[10], bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-11-Nov', false);
Map.addLayer(listaBioAnpp[11], bioAnppVis, 'Bio+ANPP ' + anoAlvo + '-12-Dez', false);

// --- Produção integrada anual do bioma (kg MS/ha/ano) — camada síntese ---
//Map.addLayer(producaoAnual, producaoVis, 'Producao anual campo Pantanal ' + anoAlvo, true);

//print('Produção anual: soma dos 12 meses de (Biomassa + ANPP) em kg MS/ha/ano');