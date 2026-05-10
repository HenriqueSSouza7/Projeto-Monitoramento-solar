# Sistema de Monitoramento Solar  ☀️

Este projeto consiste em uma plataforma de monitoramento e análise de dados para sistemas de geração de energia fotovoltaica. O foco principal é realizar um comparativo de eficiência em tempo real entre um **Painel solar fixo** e um **Painel com rastreador solar (Tracker)**.

##  Sobre o Projeto

O sistema coleta dados de tensão e corrente de protótipos físicos via sensores INA219 integrados ao microcontrolador. Esses dados são enviados para a nuvem (ThingSpeak) e consumidos por este dashboard, que realiza o tratamento estatístico e financeiro para determinar a viabilidade econômica do rastreamento solar.

##  Funcionalidades

- **Visualização analítica:** Gráficos de geração horária comparando os dois sistemas.
- **Análise financeira:** Projeção mensal da conta de luz com e sem os sistemas solares.
- **Cálculo de eficiência líquida:** Considera o gasto energético do motor para mover o rastreador.
- **Modo simulação:** Permite demonstrar o software mesmo sem o hardware conectado.
- **Exportação de dados:** Opção para baixar os logs de geração em formato CSV.

##  Lógica de cálculo 

Para garantir a precisão acadêmica, o software aplica os seguintes princípios de engenharia elétrica e integração discreta:

### 1. Cálculo da potência instantânea
A potência gerada é calculada a partir da Tensão (V) e Corrente (mA) lidas pelos sensores:
- **Potência (W)** = (V * mA) / 1000

### 2. Conversão de potência para energia (Wh)
Como os dados são recebidos em intervalos de 1 minuto, realizamos a integração temporal para converter a potência do momento em energia acumulada:
- **Energia (Wh)** = Potência (W) / 60

### 3. Rendimento líquido do rastreador
A eficiência real do rastreador considera o "pedágio" energético cobrado pelo servomotor:
- **Energia Líquida** = Energia bruta (Placa) - Energia gasta (Motor)

### 4. Projeção de viabilidade econômica
O sistema valida se a economia extra gerada pelo rastreador é capaz de cobrir os custos de manutenção (OPEX) do mecanismo móvel:
- **Economia Mensal** = (Economia diária * 30) - Custo de manutenção

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 (Custom Properties), JavaScript (ES6+).
- **Ícones:** Lucide Icons.
- **Integração:** ThingSpeak API (REST).
- **Estilização:** Conceitos de soft UI e Responsive design.

---
*Projeto desenvolvido para fins acadêmicos 