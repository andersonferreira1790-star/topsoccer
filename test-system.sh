#!/bin/bash
# Script de Teste - Top Soccer Excellence
# Data: 25 de Fevereiro de 2026

echo "╔════════════════════════════════════════════════════════╗"
echo "║     🧪 TESTE COMPLETO - TOP SOCCER EXCELLENCE         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0

# Função de teste
test_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAIL++))
    fi
}

test_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $3"
        ((FAIL++))
    fi
}

echo -e "${BLUE}📁 Testando Arquivos Principais...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_file "index.html" "index.html existe"
test_file "script.js" "script.js existe"
test_file "styles.css" "styles.css existe"
test_file "pagamento.html" "pagamento.html existe"
test_file "admin.html" "admin.html existe"
echo ""

echo -e "${BLUE}🔐 Testando Credenciais Supabase...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_content "script.js" "ibchbcxtzngihxjschgl.supabase.co" "URL do Supabase configurada"
test_content "script.js" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" "Chave do Supabase configurada"
echo ""

echo -e "${BLUE}⚙️ Testando Funções JavaScript...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_content "script.js" "function inicializarSupabase" "inicializarSupabase() definida"
test_content "script.js" "function tentarAgendar" "tentarAgendar() definida"
test_content "script.js" "function fazerLogin" "fazerLogin() definida"
test_content "script.js" "function criarConta" "criarConta() definida"
test_content "script.js" "function salvarReserva" "salvarReserva() definida"
test_content "script.js" "function buscarAgendamentos" "buscarAgendamentos() definida"
test_content "script.js" "function renderHorarios" "renderHorarios() definida"
test_content "script.js" "function abrirCalendario" "abrirCalendario() definida"
echo ""

echo -e "${BLUE}🎨 Testando Elementos HTML...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_content "index.html" "id=\"calendarModal\"" "Modal de calendário existe"
test_content "index.html" "id=\"regrasModal\"" "Modal de regras existe"
test_content "index.html" "id=\"authModal\"" "Modal de autenticação existe"
test_content "index.html" "id=\"timeContainer\"" "Container de horários existe"
test_content "index.html" "id=\"checkboxRegras\"" "Checkbox de regras existe"
test_content "index.html" "id=\"btnContinuarRegras\"" "Botão continuar regras existe"
echo ""

echo -e "${BLUE}🎯 Testando Estilos CSS...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_content "styles.css" ".time-slot" "Classe .time-slot definida"
test_content "styles.css" ".disponivel" "Classe .disponivel definida"
test_content "styles.css" ".interesse" "Classe .interesse definida"
test_content "styles.css" ".bloqueado" "Classe .bloqueado definida"
test_content "styles.css" ".modal-overlay" "Classe .modal-overlay definida"
echo ""

echo -e "${BLUE}🔄 Testando Cache Busting...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_content "index.html" "Cache-Control" "Meta tag Cache-Control presente"
test_content "index.html" "script.js?v=" "Script com versão (cache busting)"
test_content "index.html" "styles.css?v=" "CSS com versão (cache busting)"
echo ""

echo -e "${BLUE}📦 Testando Bibliotecas Externas...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_content "index.html" "jquery" "jQuery importado"
test_content "index.html" "@supabase/supabase-js" "Supabase JS importado"
test_content "index.html" "tailwindcss" "Tailwind CSS importado"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 RESULTADO DOS TESTES${NC}"
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Testes Passados:${NC} $PASS"
echo -e "${RED}✗ Testes Falhados:${NC} $FAIL"
TOTAL=$((PASS + FAIL))
echo -e "📈 Total de Testes: $TOTAL"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 TODOS OS TESTES PASSARAM COM SUCESSO!             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Próximos Passos:${NC}"
    echo "   1. Servidor HTTP rodando em: http://localhost:8080"
    echo "   2. Abra o navegador e acesse: http://localhost:8080"
    echo "   3. Teste o fluxo completo:"
    echo "      • Criar conta ou fazer login"
    echo "      • Selecionar uma quadra"
    echo "      • Clicar em 'Ver Disponibilidade'"
    echo "      • Clicar em um horário verde (disponível)"
    echo "      • Verificar se o modal de regras abre"
    echo "      • Marcar o checkbox e continuar"
    echo "      • Verificar redirecionamento para pagamento"
    exit 0
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  ALGUNS TESTES FALHARAM!                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Ações Necessárias:${NC}"
    echo "   • Verifique os arquivos marcados com [✗]"
    echo "   • Corrija os problemas encontrados"
    echo "   • Execute este teste novamente"
    exit 1
fi
