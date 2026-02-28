// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = 'https://ibchbcxtzngihxjschgl.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliY2hiY3h0em5naWh4anNjaGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTYyNzYsImV4cCI6MjA4NTI5MjI3Nn0.ybBzyBWFQIvw6EV3F_xQwvXHJBX7wTsm05xEgRqsu34'; 

var supabaseClient = null;
let currentUser = null;
let selectedQuadra = 'Quadra 1';
let selectedDate = new Date();
let selectedTime = null;
let duracaoHoras = 1;
let busySlots = []; // Array de objetos {hora, status}

// ===== TOAST NOTIFICATION =====
function showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    toast.className = 'toast toast-' + type;
    toast.textContent = icon + ' ' + msg;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// ===== FUNÇÕES UI =====
function selecionarQuadra(nome, el) {
    selectedQuadra = nome;
    $('.chip').removeClass('selected');
    $(el).addClass('selected');
    $('#quadraSelecionadaDisplay').text(nome);
}

function abrirCalendario(titulo) {
    $('#modalTitle').text(titulo);
    $('#calendarModal').addClass('active');
    renderDias();
    renderHorarios();
    buscarAgendamentos(new Date().toISOString().split('T')[0]);
}

function fecharModal(id) { 
    $(`#${id}`).removeClass('active');
    
    // Limpar aviso extra do modal de regras ao fechar
    if (id === 'regrasModal') {
        setTimeout(() => {
            $('#regrasInfo > div:first-child').remove();
        }, 300);
    }
    
    setTimeout(() => {
        if (!$(`#${id}`).hasClass('active')) {
            // Apenas para garantir limpeza
        }
    }, 500);
}

function toggleAuth(v) { 
    if(v === 'login') { 
        $('#loginView').fadeOut(200, function() {
            $(this).removeClass('hidden');
            $('#cadastroView').addClass('hidden');
        }).fadeIn(200);
        $('#cadastroView').fadeOut(200);
    } else if(v === 'cadastro') { 
        $('#cadastroView').fadeOut(200, function() {
            $(this).removeClass('hidden');
            $('#loginView').addClass('hidden');
        }).fadeIn(200);
        $('#loginView').fadeOut(200);
    }
}

function checkAuthAndOpen() {
    console.log('👤 Clique no ícone - usuário logado?', currentUser ? 'SIM' : 'NÃO');
    
    if(currentUser) { 
        // Usuário ESTÁ logado - mostrar opção de sair
        if(confirm("Deseja sair de sua conta?")) { 
            try {
                supabaseClient.auth.signOut();
                currentUser = null;
                localStorage.clear();
                window.location.href = 'index.html';
            } catch(e) {
                console.error('Erro ao sair:', e);
                window.location.reload();
            }
        } 
    } else {
        // Usuário NÃO está logado - abrir modal de login
        console.log('Abrindo modal de login');
        $('#authModal').addClass('active'); 
        toggleAuth('login');
    }
}

// ===== FUNÇÕES RENDER =====
function renderDias() {
    let html = '';
    for(let i=0; i<30; i++) {
        let d = new Date(); 
        d.setDate(new Date().getDate() + i);
        let active = i === 0 ? 'active' : '';
        html += `<div class="day-card ${active}" onclick="selecionarDia(this, ${i})"><span class="day-name">${weekDays[d.getDay()]}</span><span class="day-number">${d.getDate()}</span></div>`;
    }
    $('#daysContainer').html(html);
}

function renderHorarios() {
    let html = '';
    for(let i=0; i<33; i++) { 
        let h = Math.floor(7 + i/2);
        let m = (i % 2) === 0 ? '00' : '30';
        let time = `${h.toString().padStart(2,'0')}:${m}`;
        
        // Verificar status do horário
        let slotInfo = busySlots.find(slot => slot.hora === time);
        let statusClass = 'disponivel'; // padrão: disponível (verde claro)
        let clickable = true;
        
        if (slotInfo) {
            if (slotInfo.status === 'confirmado' || slotInfo.status === 'concluido') {
                statusClass = 'bloqueado'; // vermelho - já reservado
                clickable = false;
            } else if (slotInfo.status === 'interesse') {
                statusClass = 'interesse'; // amarelo - tem interesse(s)
            }
        }
        
        // Só adiciona onclick se for clicável
        const onclickAttr = clickable ? `onclick="tentarAgendar('${time}')"` : '';
        html += `<div class="time-slot ${statusClass}" ${onclickAttr}>${time}</div>`;
    }
    $('#timeContainer').html(html);
}

function selecionarDia(el, diasExtra) {
    $('.day-card').removeClass('active'); 
    $(el).addClass('active');
    let hoje = new Date();
    selectedDate = new Date(hoje.setDate(hoje.getDate() + diasExtra));
    buscarAgendamentos(selectedDate.toISOString().split('T')[0]);
    renderHorarios();
}

// FUNÇÕES ANTIGAS - NÃO USADAS NO NOVO FLUXO
// function selecionarHora(el, time) {...}
// function handleBtnConfirmar() {...}

function mudarDuracao(h, el) {
    duracaoHoras = h;
    $('.btn-duracao').removeClass('active'); 
    $(el).addClass('active');
}

function tentarAgendar(time) {
    console.log('🔔 tentarAgendar chamado com:', time);
    
    // Verificar se o horário está bloqueado
    const slotInfo = busySlots.find(slot => slot.hora === time);
    
    if (slotInfo && (slotInfo.status === 'confirmado' || slotInfo.status === 'concluido')) {
        showToast('Este horário já está reservado!', 'error');
        return;
    }
    
    if (!currentUser) {
        console.log('❌ Usuário não logado');
        if(confirm("🔒 Para agendar, faça login.")) {
            fecharModal('calendarModal');
            setTimeout(() => {
                $('#authModal').addClass('active');
                toggleAuth('login');
            }, 300);
        }
        return;
    }
    
    // Usuário logado - selecionar o horário e abrir modal de regras
    console.log('✅ Usuário logado, abrindo modal de regras');
    selectedTime = time;
    
    // Atualizar info do modal com os dados da reserva
    const temInteresse = slotInfo && slotInfo.status === 'interesse';
    
    // Destacar aviso se já tem interesse de outros
    if (temInteresse) {
        $('#regrasInfo').prepend(`
            <div style="background: rgba(255,200,0,0.2); border: 2px solid #FFC800; border-radius: 15px; padding: 15px; margin-bottom: 20px; animation: pulse 2s infinite;">
                <p style="color: #FFC800; font-weight: 900; font-size: 13px; text-align: center;">
                    ⚡ ATENÇÃO: Outras pessoas já demonstraram interesse neste horário!<br>
                    <span style="color: white; font-size: 12px;">Quem pagar primeiro garante a reserva!</span>
                </p>
            </div>
        `);
    }
    
    // Resetar checkbox
    $('#checkboxRegras').prop('checked', false);
    $('#btnContinuarRegras').prop('disabled', true);
    
    // Fechar calendário e abrir modal de regras
    fecharModal('calendarModal');
    setTimeout(() => {
        console.log('📦 Abrindo modal regrasModal');
        $('#regrasModal').addClass('active');
    }, 300);
}

// Garantir que está no escopo global
window.tentarAgendar = tentarAgendar;

// Funções do Modal de Regras
function toggleCheckboxRegras() {
    const checkbox = document.getElementById('checkboxRegras');
    checkbox.checked = !checkbox.checked;
    habilitarBotaoRegras();
}

function habilitarBotaoRegras() {
    const checkbox = document.getElementById('checkboxRegras');
    const botao = document.getElementById('btnContinuarRegras');
    
    if (checkbox.checked) {
        botao.disabled = false;
        botao.style.cursor = 'pointer';
    } else {
        botao.disabled = true;
        botao.style.cursor = 'not-allowed';
    }
}

function confirmarRegrasEContinuar() {
    // Fechar modal de regras
    fecharModal('regrasModal');
    
    // Salvar interesse e redirecionar para pagamento
    setTimeout(() => {
        salvarReserva();
    }, 300);
}

// Garantir que funções estão no escopo global
window.toggleCheckboxRegras = toggleCheckboxRegras;
window.habilitarBotaoRegras = habilitarBotaoRegras;
window.confirmarRegrasEContinuar = confirmarRegrasEContinuar;

// ===== FUNÇÕES SUPABASE =====
async function inicializarSupabase() {
    try {
        if (!window.supabase) {
            console.error('Supabase não disponível');
            return;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Supabase OK");
        
        // Listener para mudanças de autenticação (captura retorno do Google OAuth)
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth event:', event);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('✅ Login detectado:', session.user.email);
                currentUser = session.user;
                
                // Salvar dados localmente
                localStorage.setItem('userEmail', currentUser.email);
                localStorage.setItem('userId', currentUser.id);
                localStorage.setItem('loginTime', Date.now());
                
                // Redirecionar para admin
                showToast('Login com Google realizado!', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html?v=' + Date.now();
                }, 1000);
            }
            
            if (event === 'SIGNED_OUT') {
                console.log('🚪 Logout detectado');
                currentUser = null;
                localStorage.clear();
            }
        });
        
        await checkSession();
    } catch(e) { 
        console.error('❌ Erro:', e);
    }
}

async function checkSession() {
    if(!supabaseClient) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            document.getElementById('userStatusBtn').innerHTML = '✅';
            document.getElementById('userStatusBtn').style.background = '#39FF14';
            document.getElementById('userStatusBtn').style.color = 'black';
            
            // Atualizar botão para ir para painel
            if ($('#btnConfirmar').length) {
                $('#btnConfirmar')
                    .text("IR PARA PAINEL DE AGENDAMENTO")
                    .css('background', '#FF4500')
                    .css('color', 'black')
                    .off('click')
                    .on('click', function() {
                        window.location.href = 'admin.html?v=' + Date.now();
                    });
            }
        } else {
            currentUser = null;
            document.getElementById('userStatusBtn').innerHTML = '👤';
            document.getElementById('userStatusBtn').style.background = 'rgba(255,255,255,0.1)';
            document.getElementById('userStatusBtn').style.color = 'white';
            
            if ($('#btnConfirmar').length) {
                $('#btnConfirmar')
                    .text("🔒 Faça Login para Agendar")
                    .css('background', '#333')
                    .css('color', '#888')
                    .off('click')
                    .on('click', function() {
                        tentarAgendar();
                    });
            }
        }
    } catch(e) {
        console.error('Erro:', e);
    }
}

async function fazerLogin() {
    const email = $('#loginEmail').val().trim().toLowerCase();
    const password = $('#loginPassword').val().trim();
    
    if (!email || !password) {
        showToast('Preencha email e senha!', 'warn');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            showToast(error.message, 'error');
        } else {
            currentUser = data.user;
            
            // Salvar dados localmente para dashboard
            localStorage.setItem('userEmail', currentUser.email);
            localStorage.setItem('userId', currentUser.id);
            localStorage.setItem('loginTime', Date.now());
            
            fecharModal('authModal');
            checkSession();
            showToast('Login realizado! Redirecionando...', 'success');
            
            // Redirecionar para dashboard com cache busting
            setTimeout(() => {
                window.location.href = 'admin.html?v=' + Date.now();
            }, 1000);
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

// Login com Google
async function fazerLoginGoogle() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/admin.html'
            }
        });
        
        if (error) {
            console.error('Erro ao logar com Google:', error.message);
            showToast('Erro ao conectar com o Google. Tente novamente.', 'error');
        }
        // O OAuth vai redirecionar automaticamente
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function criarConta() {
    const email = $('#regEmail').val().trim().toLowerCase();
    const password = $('#regPassword').val().trim();
    const nome = $('#regNome').val().trim();
    const whats = $('#regWhats').val().trim();
    
    if (!email || !password || !nome || !whats) {
        showToast('Preencha todos os campos!', 'warn');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showToast('Email inválido! Use um formato válido (ex: usuario@email.com)', 'warn');
        return;
    }

    if (password.length < 6) {
        showToast('Senha deve ter no mínimo 6 caracteres!', 'warn');
        return;
    }

    if (nome.length < 3) {
        showToast('Nome deve ter no mínimo 3 caracteres!', 'warn');
        return;
    }

    if (whats.length < 10) {
        showToast('WhatsApp inválido! Formato: (XX) 9XXXX-XXXX', 'warn');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: nome,
                    whatsapp: whats
                }
            }
        });
        
        if (error) {
            if (error.message.includes('rate limit')) {
                showToast('Muitas tentativas! Aguarde 5 minutos.', 'warn');
            } else if (error.message.includes('already exists')) {
                showToast('Este email já está cadastrado! Faça login.', 'warn');
            } else if (error.message.includes('email')) {
                showToast('Erro no email: ' + error.message, 'error');
            } else {
                showToast(error.message, 'error');
            }
        } else {
            // Salvar dados localmente para dashboard
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userId', data.user.id);
            
            currentUser = data.user;
            localStorage.setItem('loginTime', Date.now());
            showToast('Conta criada com sucesso! Redirecionando...', 'success');
            
            // Redirecionar para dashboard após 1 segundo com cache busting
            setTimeout(() => {
                window.location.href = 'admin.html?v=' + Date.now();
            }, 1000);
        }
    } catch(e) {
        showToast(e.message, 'error');
    }
}

async function buscarAgendamentos(dataISO) {
    if(!supabaseClient) return;
    try {
        busySlots = [];

        // 1. Buscar da tabela RESERVAS (reservas individuais de quadra)
        const { data: reservas, error: errReservas } = await supabaseClient
            .from('reservas')
            .select('hora_inicio, status')
            .eq('data', dataISO)
            .eq('quadra', selectedQuadra);

        if (!errReservas && reservas) {
            reservas.forEach(d => {
                busySlots.push({ hora: d.hora_inicio, status: d.status });
            });
        }

        // 2. Buscar da tabela AGENDAMENTOS (jogos criados pelo owner/admin)
        const { data: agendamentos, error: errAgend } = await supabaseClient
            .from('agendamentos')
            .select('hora_inicio, hora_fim, status, duracao')
            .eq('data_jogo', dataISO)
            .eq('sub_recurso', selectedQuadra)
            .in('status', ['interesse', 'confirmado', 'concluido']);

        if (!errAgend && agendamentos) {
            agendamentos.forEach(ag => {
                // Preencher todos os slots ocupados pela duração do agendamento
                const [h, m] = ag.hora_inicio.split(':').map(Number);
                const duracaoSlots = (ag.duracao || 1) * 2; // cada slot = 30min
                for (let i = 0; i < duracaoSlots; i++) {
                    const totalMin = h * 60 + m + (i * 30);
                    const slotH = Math.floor(totalMin / 60).toString().padStart(2, '0');
                    const slotM = (totalMin % 60).toString().padStart(2, '0');
                    const slotTime = `${slotH}:${slotM}`;
                    // Só adicionar se não existir já (reservas tem prioridade)
                    if (!busySlots.find(s => s.hora === slotTime)) {
                        busySlots.push({ hora: slotTime, status: ag.status });
                    }
                }
            });
        }

        console.log('📅 Horários ocupados:', busySlots.length, busySlots);
        renderHorarios();
    } catch(e) {
        console.error('Erro:', e);
        busySlots = [];
        renderHorarios();
    }
}

async function salvarReserva() {
    if (!currentUser) {
        $('#authModal').addClass('active');
        toggleAuth('login');
        return;
    }
    
    if (!selectedTime) {
        showToast('Selecione um horário!', 'warn');
        return;
    }

    const dataFormatada = selectedDate.toISOString().split('T')[0];
    
    // Calcular hora_fim (1 hora depois)
    const [hora, minuto] = selectedTime.split(':');
    const horaFim = `${(parseInt(hora) + duracaoHoras).toString().padStart(2, '0')}:${minuto}`;

    try {
        // Inserir como "interesse" até que o pagamento seja confirmado
        const { data, error } = await supabaseClient.from('reservas').insert({
            user_id: currentUser.id,
            quadra: selectedQuadra,
            data: dataFormatada,
            hora_inicio: selectedTime,
            hora_fim: horaFim,
            status: 'interesse' // Será mudado para 'confirmado' após pagamento de 30%
        }).select();

        if (error) {
            console.error('Erro ao salvar:', error);
            showToast('Erro ao salvar interesse: ' + error.message, 'error');
        } else {
            console.log('✅ Interesse registrado:', data);
            
            // Salvar ID da reserva para usar no pagamento
            const reservaId = data[0].id;
            localStorage.setItem('reserva_pendente_id', reservaId);
            localStorage.setItem('reserva_pendente_quadra', selectedQuadra);
            localStorage.setItem('reserva_pendente_data', dataFormatada);
            localStorage.setItem('reserva_pendente_hora', selectedTime);
            
            // Redirecionar para página de pagamento
            console.log('🔄 Redirecionando para pagamento...');
            console.log('📋 ID da reserva:', reservaId);
            
            showToast('Interesse registrado! Redirecionando para pagamento...', 'success');
            
            // Fechar modais antes de redirecionar
            fecharModal('regrasModal');
            fecharModal('calendarModal');
            
            setTimeout(() => {
                const url = `pagamento.html?reserva=${reservaId}`;
                console.log('🚀 Redirecionando para:', url);
                window.location.href = url;
            }, 1500);
        }
    } catch(e) {
        console.error('❌ Erro:', e);
        showToast('Erro ao salvar: ' + e.message, 'error');
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    renderDias();
    inicializarSupabase();
    
    // Botão de login com Google
    const btnGoogle = document.getElementById('btn-google');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', fazerLoginGoogle);
    }
});
