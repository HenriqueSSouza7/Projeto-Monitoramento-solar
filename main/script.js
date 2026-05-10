// ==========================================
// CONFIGURAÇÕES GLOBAIS DO SISTEMA
// ==========================================
const CHAVE_CONFIG = "projeto_solar_config";

let configuracao = {
  // Dados da API do ThingSpeak (Modo Desenvolvedor)
  canalId: "", 
  apiRead: "BV4S8WP94X0YY8R0",
  campos: { tensao: 1, corrente: 2, motor: 3 },
  // Dados que o cliente preenche na interface
  datas: { 
    fixo: new Date().toISOString().split('T')[0], 
    tracker: new Date().toISOString().split('T')[0] 
  },
  financeiro: {
    regiao: 0.78,
    bandeira: 0,
    consumoCasa: 200,
    manutencao: 5.00
  }
};

let dadosAnalise = {
  horas: Array(24).fill(0).map(() => ({ whFixo: 0, whTracker: 0 })),
  resumo: { whFixo: 0, whTrkBruto: 0, whTrkMotor: 0, whTrkLiq: 0 }
};

const $ = (id) => document.getElementById(id);
const inserirTexto = (id, valor) => { if($(id)) $(id).textContent = valor; };
const formatarNum = (num, casas) => Number(num).toFixed(casas);
const formatoRS = (num) => `R$ ${num.toFixed(2).replace('.', ',')}`;

lucide.createIcons();

// ==========================================
// SISTEMA DE ACORDEÃO (ABRIR E FECHAR ABAS)
// ==========================================
function togglePanel(conteudoId, iconeId) {
  const conteudo = $(conteudoId);
  const icone = $(iconeId);
  
  if (conteudo.classList.contains('collapsed')) {
    conteudo.classList.remove('collapsed');
    icone.style.transform = 'rotate(0deg)'; 
  } else {
    conteudo.classList.add('collapsed');
    icone.style.transform = 'rotate(-180deg)'; 
  }
}

// ==========================================
// LÓGICA DE MATEMÁTICA E CONEXÃO COM A API
// ==========================================
function carregarConfiguracaoLocal() {
  const salva = localStorage.getItem(CHAVE_CONFIG);
  if (salva) configuracao = JSON.parse(salva);
}

function modoRealAtivo() {
  return configuracao.canalId.trim().length > 0 && configuracao.datas.fixo && configuracao.datas.tracker;
}

// Faz a requisição na internet para buscar as leituras
async function buscarDiaAPI(dataStr) {
  const url = new URL(`https://api.thingspeak.com/channels/${configuracao.canalId}/feeds.json`);
  url.searchParams.set("start", `${dataStr}T00:00:00Z`);
  url.searchParams.set("end", `${dataStr}T23:59:59Z`);
  if (configuracao.apiRead) url.searchParams.set("api_key", configuracao.apiRead);
  
  const resposta = await fetch(url.toString());
  if (!resposta.ok) throw new Error("Erro de conexão ThingSpeak");
  const json = await resposta.json();
  return json.feeds || [];
}

// Transforma os dados crus da API em energia real
function processarFeedsDoDia(feeds) {
  let whGerado = 0;
  let whMotor = 0;
  const distribuicaoHoraria = Array(24).fill(0).map(() => ({ gerado: 0, gasto: 0 }));

  feeds.forEach(f => {
    const v = parseFloat(f[`field${configuracao.campos.tensao}`]) || 0;
    const c = parseFloat(f[`field${configuracao.campos.corrente}`]) || 0;
    const m = parseFloat(f[`field${configuracao.campos.motor}`]) || 0; // Vai ler o "1.0" do ESP32 aqui

    // A mágica matemática: converte a potência do minuto em Energia (Wh)
    const potenciaW = (v * c) / 1000;
    const energiaWh = potenciaW / 60;
    const energiaMotorWh = m / 60;

    whGerado += energiaWh;
    whMotor += energiaMotorWh;

    const hora = new Date(f.created_at).getHours();
    if(hora >= 0 && hora <= 23) {
      distribuicaoHoraria[hora].gerado += energiaWh;
      distribuicaoHoraria[hora].gasto += energiaMotorWh;
    }
  });

  return { whGerado, whMotor, distribuicaoHoraria };
}

// ==========================================
// DADOS FICTÍCIOS (MOCK PARA APRESENTAÇÃO)
// ==========================================
function gerarDiaMock(isTracker) {
  let whGerado = 0;
  let whMotor = 0;
  const distribuicaoHoraria = Array(24).fill(0).map(() => ({ gerado: 0, gasto: 0 }));

  for (let h = 6; h <= 18; h++) {
    const intensidadeSol = Math.sin(((h - 6) / 12) * Math.PI); 
    let whDaHora = (isTracker ? 25 : 18) * intensidadeSol + (Math.random() * 2);
    
    // Gasto calibrado para o Servomotor SG90 (~1 Watt)
    let motorDaHora = isTracker ? 1.0 : 0; 

    whGerado += whDaHora;
    whMotor += motorDaHora;
    
    distribuicaoHoraria[h].gerado = whDaHora;
    distribuicaoHoraria[h].gasto = motorDaHora;
  }
  return { whGerado, whMotor, distribuicaoHoraria };
}

// ==========================================
// RENDERIZAÇÃO DA TELA E CÁLCULOS FINANCEIROS
// ==========================================
function calcularEconomiaDia(wh) {
  const tarifaKwh = parseFloat(configuracao.financeiro.regiao) + parseFloat(configuracao.financeiro.bandeira);
  return (wh / 1000) * tarifaKwh;
}

function renderizarDashboard() {
  const rs = dadosAnalise.resumo;
  const tarifaKwh = parseFloat(configuracao.financeiro.regiao) + parseFloat(configuracao.financeiro.bandeira);
  const consumoCasaKwh = parseFloat(configuracao.financeiro.consumoCasa) || 200;
  
  const geracaoMesFixoKwh = (rs.whFixo * 30) / 1000;
  const geracaoMesTrkKwh = (rs.whTrkLiq * 30) / 1000;
  const custoManutencao = parseFloat(configuracao.financeiro.manutencao) || 0;
  
  const valorContaSem = consumoCasaKwh * tarifaKwh;
  const valorContaFixo = Math.max((consumoCasaKwh - geracaoMesFixoKwh) * tarifaKwh, 0);
  const valorContaTrk = Math.max((consumoCasaKwh - geracaoMesTrkKwh) * tarifaKwh, 0) + custoManutencao;

  inserirTexto("projContaSem", formatoRS(valorContaSem));
  inserirTexto("projContaFixo", formatoRS(valorContaFixo));
  inserirTexto("projContaTrk", formatoRS(valorContaTrk));

  const energiaExtraWh = rs.whTrkLiq - rs.whFixo;
  const percentualGeracao = rs.whFixo > 0 ? (energiaExtraWh / rs.whFixo) * 100 : 0;
  
  inserirTexto("projGanhoEnergia", `${percentualGeracao > 0 ? '+' : ''}${percentualGeracao.toFixed(1)}%`);
  $("projGanhoEnergia").style.color = percentualGeracao > 0 ? "var(--solar-green)" : "var(--destructive)";

  const vantagemFinanceiraTrk = valorContaFixo - valorContaTrk; 
  inserirTexto("projValeAPena", `${vantagemFinanceiraTrk > 0 ? '+' : ''} ${formatoRS(vantagemFinanceiraTrk)}`);
  
  if(vantagemFinanceiraTrk > 0) {
    $("projValeAPena").style.color = "var(--solar-green)";
    $("projTextoVeredito").textContent = "Lucro (rastreador x fixo)";
  } else {
    $("projValeAPena").style.color = "var(--destructive)";
    $("projTextoVeredito").textContent = "Prejuízo (rastreador x fixo)";
  }

  inserirTexto("whFixo", formatarNum(rs.whFixo, 2));
  inserirTexto("rsFixo", formatoRS(calcularEconomiaDia(rs.whFixo)));
  inserirTexto("whTrkBruto", formatarNum(rs.whTrkBruto, 2));
  inserirTexto("whTrkMotor", formatarNum(rs.whTrkMotor, 2));
  inserirTexto("whTrkLiq", formatarNum(rs.whTrkLiq, 2));
  inserirTexto("rsTracker", formatoRS(calcularEconomiaDia(rs.whTrkLiq)));

  desenharGrafico();
}

function desenharGrafico() {
  const container = $("containerGrafico");
  let htmlDoGrafico = "";
  const picoMaximo = Math.max(...dadosAnalise.horas.flatMap(h => [h.whFixo, h.whTracker]), 0.1);

  for (let h = 5; h <= 19; h++) {
    const dadosHora = dadosAnalise.horas[h];
    const pctFixo = Math.max((dadosHora.whFixo / picoMaximo) * 100, 1);
    const pctTracker = Math.max((dadosHora.whTracker / picoMaximo) * 100, 1);
    
    htmlDoGrafico += `
      <div class="chart-bar-group" title="${h}h00 - Fixo: ${formatarNum(dadosHora.whFixo, 2)}Wh | Rastr: ${formatarNum(dadosHora.whTracker, 2)}Wh">
        <div class="chart-bar-pair">
          <div class="chart-bar fixed" style="height: ${pctFixo}%"></div>
          <div class="chart-bar tracker" style="height: ${pctTracker}%"></div>
        </div>
        <span class="chart-time">${h}h</span>
      </div>
    `;
  }
  container.innerHTML = htmlDoGrafico;
}

// ==========================================
// FLUXO PRINCIPAL E EVENTOS
// ==========================================
async function processarTestes() {
  const btn = $("btnAtualizar").querySelector('svg');
  if(btn) btn.classList.add("spinning");

  try {
    let diaFixo, diaTracker;

    if (modoRealAtivo()) {
      $("avisoDemo").style.display = "none";
      const feedsFixo = await buscarDiaAPI(configuracao.datas.fixo);
      const feedsTracker = await buscarDiaAPI(configuracao.datas.tracker);
      
      diaFixo = processarFeedsDoDia(feedsFixo);
      diaTracker = processarFeedsDoDia(feedsTracker);
    } else {
      $("avisoDemo").style.display = "flex";
      diaFixo = gerarDiaMock(false);
      diaTracker = gerarDiaMock(true);
    }

    dadosAnalise.resumo.whFixo = diaFixo.whGerado;
    dadosAnalise.resumo.whTrkBruto = diaTracker.whGerado;
    dadosAnalise.resumo.whTrkMotor = diaTracker.whMotor;
    dadosAnalise.resumo.whTrkLiq = diaTracker.whGerado - diaTracker.whMotor;

    for(let h=0; h<24; h++) {
      dadosAnalise.horas[h].whFixo = diaFixo.distribuicaoHoraria[h].gerado;
      dadosAnalise.horas[h].whTracker = diaTracker.distribuicaoHoraria[h].gerado - diaTracker.distribuicaoHoraria[h].gasto;
    }

    $("avisoErro").style.display = "none";
    renderizarDashboard();
  } catch (e) {
    $("avisoErro").style.display = "flex";
    inserirTexto("textoErro", "Falha de comunicação: " + e.message);
  } finally {
    if(btn) btn.classList.remove("spinning");
  }
}

// Modais e Togglers
function abrirModal() {
  $("cfgDataFixo").value = configuracao.datas.fixo;
  $("cfgDataTracker").value = configuracao.datas.tracker;
  $("cfgRegiao").value = configuracao.financeiro.regiao;
  $("cfgBandeira").value = configuracao.financeiro.bandeira;
  $("cfgConsumoCasa").value = configuracao.financeiro.consumoCasa;
  $("cfgManutencao").value = configuracao.financeiro.manutencao;
  
  $("cfgCanal").value = configuracao.canalId;
  $("cfgChave").value = configuracao.apiRead;
  $("cfgTen").value = configuracao.campos.tensao;
  $("cfgCor").value = configuracao.campos.corrente;
  $("cfgMot").value = configuracao.campos.motor;

  $("modalConfig").classList.add("open");
}

function fecharModal() { 
  $("modalConfig").classList.remove("open"); 
  $("areaDev").style.display = "none"; 
}

function toggleDevMode() {
  const area = $("areaDev");
  area.style.display = area.style.display === "none" ? "block" : "none";
}

function salvarConfiguracao() {
  configuracao.datas = {
    fixo: $("cfgDataFixo").value, tracker: $("cfgDataTracker").value
  };
  configuracao.financeiro = {
    regiao: parseFloat($("cfgRegiao").value),
    bandeira: parseFloat($("cfgBandeira").value),
    consumoCasa: parseFloat($("cfgConsumoCasa").value),
    manutencao: parseFloat($("cfgManutencao").value)
  };

  configuracao.canalId = $("cfgCanal").value.trim();
  configuracao.apiRead = $("cfgChave").value.trim();
  configuracao.campos = {
    tensao: parseInt($("cfgTen").value) || 1, 
    corrente: parseInt($("cfgCor").value) || 2, 
    motor: parseInt($("cfgMot").value) || 3
  };
  
  localStorage.setItem(CHAVE_CONFIG, JSON.stringify(configuracao));
  fecharModal();
  processarTestes(); 
}

function baixarRelatorioCSV() {
  let csv = "Hora do Dia,Energia Fixo (Wh),Energia Rastreador Liquida (Wh)\n";
  for(let h=5; h<=19; h++) {
    csv += `${h}h00,${dadosAnalise.horas[h].whFixo.toFixed(3)},${dadosAnalise.horas[h].whTracker.toFixed(3)}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Relatorio_Comparativo.csv`;
  link.click();
}

document.addEventListener("DOMContentLoaded", () => {
  carregarConfiguracaoLocal();
  processarTestes();
});